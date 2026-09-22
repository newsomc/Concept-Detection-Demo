import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createEncoder } from './encoder.mjs';
import { createHash } from 'node:crypto';
import { training, validation, test } from '../data/training.mjs';
import { descriptors } from '../src/descriptors.js';
import { scoreEmbedding, sigmoid, splitText } from '../src/classifier.js';
const encoderName = process.argv.includes('--use') ? 'use' : 'minilm';
const suffix = encoderName === 'use' ? '-use' : '';
const encoderSource = await readFile(`public/models/${encoderName === 'use' ? 'use-source' : 'source'}.json`, 'utf8');
let encoder;
const embed = async text => { encoder ??= await createEncoder(encoderName); return encoder(text); };
const rows = [...training, ...validation, ...test], labels = descriptors.map(d => d.name);
const fingerprint = createHash('sha256').update(encoderName + encoderSource + JSON.stringify(rows)).digest('hex');
let embeddings;
try { const cached = JSON.parse(await readFile(`data/embeddings${suffix}.json`)); if (cached.fingerprint === fingerprint) embeddings = cached.embeddings; } catch {}
if (!embeddings) {
  console.log('Loading local encoder…');
  embeddings = [];
  for (let i = 0; i < rows.length; i++) {
    embeddings.push(await embed(rows[i].text));
    if (i % 50 === 0) console.log(`Embedded ${i}/${rows.length} examples`);
  }
  await writeFile(`data/embeddings${suffix}.json`, JSON.stringify({ fingerprint, embeddings }));
}
const dimension = embeddings[0].length, n = training.length;
const weights = [], bias = [];
console.log(`Training 16 independent logistic heads on ${n} labeled examples…`);
for (let k = 0; k < labels.length; k++) {
  const w = new Float64Array(dimension), grad = new Float64Array(dimension);
  const targets = training.map(row => Number(row.labels.includes(labels[k])));
  const positives = targets.reduce((a, b) => a + b, 0);
  const positiveWeight = Math.sqrt((n - positives) / positives);
  let b = -2;
  for (let epoch = 0; epoch < 450; epoch++) {
    grad.fill(0); let gb = 0;
    for (let i = 0; i < n; i++) {
      const x = embeddings[i]; let z = b;
      for (let j = 0; j < dimension; j++) z += w[j] * x[j];
      const err = (sigmoid(z) - targets[i]) * (targets[i] ? positiveWeight : 1);
      gb += err;
      for (let j = 0; j < dimension; j++) grad[j] += err * x[j];
    }
    const rate = 4;
    for (let j = 0; j < dimension; j++) w[j] -= rate * (grad[j] / n + 0.0005 * w[j]);
    b -= rate * gb / n;
  }
  weights.push(Array.from(w)); bias.push(b);
}
const head = { version: 3, encoder: encoderName, labels, dimension, weights, bias, thresholds: labels.map(() => .5), training: { method: `Frozen ${encoderName === 'use' ? 'USE Lite' : 'MiniLM-L3'} encoder + supervised one-vs-rest logistic regression`, scoring: 'Maximum across full sentences and generic clauses', examples: n, validationExamples: validation.length, fingerprint, dataset: 'Hand-authored English seed dataset; experimental, not production validated.' } };
// Calibrate and evaluate the same multi-span path used in the browser.
const embeddingMap = new Map(rows.map((row, i) => [row.text, embeddings[i]]));
async function scoreText(text) {
  const best = labels.map(() => 0);
  for (const span of splitText(text)) {
    if (!embeddingMap.has(span)) {
      embeddingMap.set(span, await embed(span));
    }
    const score = scoreEmbedding(embeddingMap.get(span), head);
    score.forEach((value, k) => { best[k] = Math.max(best[k], value); });
  }
  return best;
}
const valScores = [];
for (const row of validation) valScores.push(await scoreText(row.text));
head.thresholds = labels.map((label, k) => {
  let best = -1, threshold = .5;
  for (let t = .25; t <= .8; t += .025) {
    let tp = 0, fp = 0, fn = 0;
    validation.forEach((row, i) => { const truth = row.labels.includes(label), pred = valScores[i][k] >= t; if (truth && pred) tp++; if (!truth && pred) fp++; if (truth && !pred) fn++; });
    const f = 1.25 * tp / (1.25 * tp + .25 * fn + fp || 1); // F0.5 favors precision.
    if (f > best || f === best && Math.abs(t - .5) < Math.abs(threshold - .5)) { best = f; threshold = t; }
  }
  return Number(threshold.toFixed(3));
});
const testScores = [];
for (const row of test) testScores.push(await scoreText(row.text));
let tp = 0, fp = 0, fn = 0;
const cases = test.map((row, i) => {
  const predicted = labels.filter((label, k) => testScores[i][k] >= head.thresholds[k]);
  for (const label of labels) { const truth = row.labels.includes(label), pred = predicted.includes(label); if (truth && pred) tp++; if (!truth && pred) fp++; if (truth && !pred) fn++; }
  return { ...row, predicted, correct: JSON.stringify([...row.labels].sort()) === JSON.stringify([...predicted].sort()) };
});
const report = { note: 'Small hand-authored held-out smoke benchmark, not a production accuracy estimate. Thresholds selected on a separate validation split. Do not tune on this test split.', training: n, validation: validation.length, test: test.length, precision: tp / (tp + fp || 1), recall: tp / (tp + fn || 1), f1: 2 * tp / (2 * tp + fp + fn || 1), exactMatch: cases.filter(c => c.correct).length / cases.length, cases };
await mkdir('public/models', { recursive: true });
await writeFile(`public/models/classifier${suffix}.json`, JSON.stringify(head));
await writeFile(`data/evaluation${suffix}.json`, JSON.stringify({ encoder: encoderName, ...report }, null, 2));
console.log(JSON.stringify({ precision: report.precision, recall: report.recall, f1: report.f1, exactMatch: report.exactMatch }, null, 2));
console.log(`Wrote public/models/classifier${suffix}.json and data/evaluation${suffix}.json`);

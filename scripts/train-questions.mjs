import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createEncoder } from './encoder.mjs';
import { descriptorDefinitions, productCategories, taxonomyProvenance } from '../data/marketplace-taxonomy.mjs';
import { questionDataset, unseenDescriptorIds, datasetProvenance } from '../data/question-dataset.mjs';
import { featureNames, matchFeatures, matchScore, answerQuestions } from '../src/question-matcher.js';
import { splitText } from '../src/classifier.js';
import { chairDescription } from '../data/regressions.mjs';

const source = JSON.parse(await readFile('public/models/source.json'));
const encoderFingerprint = createHash('sha256').update(JSON.stringify(source)).digest('hex');
let cache = {};
try { const saved = JSON.parse(await readFile('data/question-embeddings.json')); if (saved.encoderFingerprint === encoderFingerprint) cache = saved.vectors; } catch {}
let encoder, computed = 0;
async function embed(text) {
  if (!cache[text]) { encoder ??= await createEncoder('minilm'); cache[text] = await encoder(text); if (++computed % 100 === 0) console.log(`Embedded ${computed} new passages`); }
  return cache[text];
}
const profiles = [];
for (const d of descriptorDefinitions) profiles.push({ ...d, vectors: { question: await embed(d.question), definition: await embed(d.definition), examples: await Promise.all(d.examples.map(embed)), nonAnswers: await Promise.all(d.nonAnswers.map(embed)) } });
const seenProfiles = profiles.filter(p => !unseenDescriptorIds.includes(p.id));
console.log('Preparing question/passage training pairs…');
const pairs = [];
for (const row of questionDataset.training) {
  const vector = await embed(row.text);
  for (const profile of seenProfiles) pairs.push({ x: matchFeatures(vector, profile), y: Number(row.labels.includes(profile.id)) });
}
const size = featureNames.length;
const mean = Array(size).fill(0), scale = Array(size).fill(0);
for (const row of pairs) row.x.forEach((v, i) => { mean[i] += v / pairs.length; });
for (const row of pairs) row.x.forEach((v, i) => { scale[i] += (v - mean[i]) ** 2 / pairs.length; });
scale.forEach((v, i) => { scale[i] = Math.max(Math.sqrt(v), 0.01); });
for (const row of pairs) row.x = row.x.map((v, i) => (v - mean[i]) / scale[i]);
const weights = Array(size).fill(0), grad = Array(size).fill(0);
let bias = -2;
const positives = pairs.filter(p => p.y).length, positiveWeight = Math.sqrt((pairs.length - positives) / positives);
for (let epoch = 0; epoch < 650; epoch++) {
  grad.fill(0); let gb = 0;
  for (const row of pairs) {
    const z = weights.reduce((v, w, i) => v + w * row.x[i], bias);
    const error = (1 / (1 + Math.exp(-Math.max(-40, Math.min(40, z)))) - row.y) * (row.y ? positiveWeight : 1);
    gb += error;
    row.x.forEach((v, i) => { grad[i] += error * v; });
  }
  weights.forEach((w, i) => { weights[i] -= .08 * (grad[i] / pairs.length + .001 * w); });
  bias -= .08 * gb / pairs.length;
}
const model = { version: 1, encoder: 'minilm', encoderFingerprint, featureNames, weights, bias, mean, scale, threshold: .5, training: { examples: questionDataset.training.length, pairs: pairs.length, validation: questionDataset.validation.length, unseenDescriptorIds, provenance: datasetProvenance, architecture: 'Frozen MiniLM-L3 + one shared logistic answerability head over descriptor/passage similarity features. Runtime support examples are required. Not generative QA or a fine-tuned cross-encoder.' } };
async function scoresFor(rows, allowed) {
  const result = [];
  for (const row of rows) {
    const spans = splitText(row.text), vectors = [];
    for (const span of spans) vectors.push(await embed(span));
    const candidates = row.category ? allowed.filter(p => productCategories.find(c => c.id === row.category).descriptors.includes(p.id)) : allowed;
    const answers = answerQuestions(spans, vectors, candidates, model);
    result.push({ ...row, answers });
  }
  return result;
}
const val = await scoresFor(questionDataset.validation, seenProfiles);
function metrics(rows, threshold) {
  let tp = 0, fp = 0, fn = 0, exact = 0;
  for (const row of rows) {
    let correct = true;
    for (const answer of row.answers) { const actual = row.labels.includes(answer.id), predicted = answer.confidence >= threshold; if (actual && predicted) tp++; if (!actual && predicted) fp++; if (actual && !predicted) fn++; if (actual !== predicted) correct = false; }
    if (correct) exact++;
  }
  return { precision: tp / (tp + fp || 1), recall: tp / (tp + fn || 1), f1: 2 * tp / (2 * tp + fp + fn || 1), f05: 1.25 * tp / (1.25 * tp + .25 * fn + fp || 1), exactMatch: exact / (rows.length || 1), tp, fp, fn };
}
let best = -1;
for (let threshold = .1; threshold <= .95; threshold += .025) {
  const quality = metrics(val, threshold).f1;
  if (quality > best) { best = quality; model.threshold = Number(threshold.toFixed(3)); }
}
const evaluationRows = await scoresFor(questionDataset.test, seenProfiles);
const transferRows = await scoresFor(questionDataset.unseen, profiles);
const reportRows = rows => rows.map(row => ({ text: row.text, expected: row.labels, predicted: row.answers.filter(a => a.confidence >= model.threshold).map(a => a.id), missing: row.labels.filter(id => !row.answers.some(a => a.id === id && a.confidence >= model.threshold)), unexpected: row.answers.filter(a => a.confidence >= model.threshold && !row.labels.includes(a.id)).map(a => a.id) }));
const chair = await scoresFor([{ text: chairDescription, labels: ['age_group', 'assembly', 'capacity', 'care', 'compatibility', 'contents', 'dimensions', 'features', 'finish', 'material', 'personalization', 'product_type', 'seat_height', 'style'], category: 'seating' }], profiles);
const report = { note: 'Synthetic seed benchmark. Exact support-example overlaps removed. Composite sentences share parents only within their split. Unseen descriptors have runtime support examples but no training or validation pairs.', threshold: model.threshold, counts: Object.fromEntries(Object.entries(questionDataset).map(([k, v]) => [k, v.length])), trainingPairs: pairs.length, seen: { ...metrics(evaluationRows, model.threshold), cases: reportRows(evaluationRows) }, unseen: { ...metrics(transferRows, model.threshold), cases: reportRows(transferRows) }, chair: reportRows(chair)[0] };
await mkdir('data/question-dataset', { recursive: true });
for (const [split, rows] of Object.entries(questionDataset)) await writeFile(`data/question-dataset/${split}.jsonl`, rows.map(row => JSON.stringify(row)).join('\n') + '\n');
await mkdir('public/taxonomy', { recursive: true });
const schemaFingerprint = createHash('sha256').update(JSON.stringify(descriptorDefinitions)).digest('hex');
model.taxonomyFingerprint = schemaFingerprint;
for (const category of productCategories) await writeFile(`public/taxonomy/${category.id}.json`, JSON.stringify({ ...category, encoderFingerprint, taxonomyFingerprint: schemaFingerprint, descriptors: category.descriptors.map(id => profiles.find(p => p.id === id)), provenance: taxonomyProvenance }));
await writeFile('public/taxonomy/catalog.json', JSON.stringify({ version: 1, categories: productCategories.map(({ descriptors, ...category }) => ({ ...category, descriptorCount: descriptors.length })), provenance: taxonomyProvenance }, null, 2));
await writeFile('public/models/question-matcher.json', JSON.stringify(model));
await writeFile('data/question-evaluation.json', JSON.stringify(report, null, 2));
await writeFile('data/question-embeddings.json', JSON.stringify({ encoderFingerprint, vectors: cache }));
console.log(JSON.stringify({ threshold: model.threshold, counts: report.counts, trainingPairs: pairs.length, seen: metrics(evaluationRows, model.threshold), unseen: metrics(transferRows, model.threshold), chair: report.chair }, null, 2));

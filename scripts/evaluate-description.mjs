import { readFile, writeFile } from 'node:fs/promises';
import { createEncoder } from './encoder.mjs';
import { splitText, scoreEmbedding, aggregate } from '../src/classifier.js';
import { regressions } from '../data/regressions.mjs';
const encoderName = process.argv.includes('--use') ? 'use' : 'minilm';
const suffix = encoderName === 'use' ? '-use' : '';
const head = JSON.parse(await readFile(`public/models/classifier${suffix}.json`));
const encoder = await createEncoder(encoderName);
const cases = [];
for (const row of regressions) {
  const segments = splitText(row.text), scores = [];
  for (const text of segments) scores.push(scoreEmbedding(await encoder(text), head));
  const results = aggregate(segments, scores, head);
  const predicted = results.filter(r => r.detected).map(r => r.name);
  const missed = row.labels.filter(label => !predicted.includes(label));
  const unexpected = predicted.filter(label => !row.labels.includes(label));
  cases.push({ name: row.name, expected: row.labels, predicted, missed, unexpected, results });
  console.log(JSON.stringify({ name: row.name, predicted, missed, unexpected }, null, 2));
}
await writeFile(`data/regression-evaluation${suffix}.json`, JSON.stringify({ encoder: encoderName, note: 'Known development regressions, not an independent accuracy benchmark.', cases }, null, 2));
if (process.argv.includes('--assert') && cases.some(row => row.missed.length || row.unexpected.length)) process.exitCode = 1;

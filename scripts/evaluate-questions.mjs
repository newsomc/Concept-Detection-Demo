import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEncoder } from './encoder.mjs';
import { answerQuestions } from '../src/question-matcher.js';
import { splitText } from '../src/classifier.js';
const head = JSON.parse(await readFile('public/models/question-matcher.json'));
const encode = await createEncoder('minilm');
const checks = [
  { category: 'seating', text: 'Made for adults and older teens. Minor assembly is required. All necessary hardware is included.', present: ['age_group', 'assembly', 'contents'], absent: ['certifications', 'theme'] },
  { category: 'seating', text: 'Made using responsibly sourced wood materials.', absent: ['certifications'] },
  { category: 'candles', text: 'It smells of fresh pine. Burn time is about 25 hours.', present: ['scent', 'burn_time'] },
  { category: 'prints', text: '', absent: ['framing', 'print_process', 'dimensions'] },
];
for (const check of checks) {
  const pack = JSON.parse(await readFile(`public/taxonomy/${check.category}.json`));
  const spans = splitText(check.text), vectors = [];
  for (const span of spans) vectors.push(await encode(span));
  const answers = answerQuestions(spans, vectors, pack.descriptors, head);
  const detected = answers.filter(a => a.detected).map(a => a.id);
  console.log(check.category, JSON.stringify(check.text), detected);
  for (const id of check.present || []) assert.ok(detected.includes(id), `Expected ${id}`);
  for (const id of check.absent || []) assert.ok(!detected.includes(id), `Unexpected ${id}`);
  for (const a of answers) assert.ok(a.answer === null || spans.includes(a.answer));
}
console.log('Local inference smoke checks passed. Full synthetic benchmark: data/question-evaluation.json');

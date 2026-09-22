import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { descriptorDefinitions, productCategories } from '../data/marketplace-taxonomy.mjs';
import { questionDataset, unseenDescriptorIds } from '../data/question-dataset.mjs';
import { answerQuestions, featureNames } from '../src/question-matcher.js';
const canonical = text => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
test('taxonomy references distinct descriptors with answer and near-miss examples', () => {
  const ids = new Set(descriptorDefinitions.map(d => d.id));
  assert.equal(ids.size, descriptorDefinitions.length);
  assert.equal(new Set(productCategories.map(c => c.id)).size, productCategories.length);
  for (const d of descriptorDefinitions) { assert.ok(d.question.endsWith('?')); assert.ok(d.definition); assert.ok(d.examples.length >= 2); assert.ok(d.nonAnswers.length >= 1); }
  for (const c of productCategories) { assert.equal(new Set(c.descriptors).size, c.descriptors.length); for (const id of c.descriptors) assert.ok(ids.has(id)); }
});
test('evaluation passages and composite parents do not leak across splits or from support examples', () => {
  const seen = new Map();
  const support = new Set(descriptorDefinitions.flatMap(d => [...d.examples, ...d.nonAnswers, d.question]).map(canonical));
  for (const [split, rows] of Object.entries(questionDataset)) for (const row of rows) for (const text of [row.text, ...(row.parents || [])]) {
    const key = canonical(text);
    assert.ok(!support.has(key), `Support overlap: ${text}`);
    assert.ok(!seen.has(key) || seen.get(key) === split, `Split overlap: ${text}`);
    seen.set(key, split);
  }
  for (const split of ['training', 'validation']) for (const row of questionDataset[split]) assert.ok(row.labels.every(id => !unseenDescriptorIds.includes(id)));
});
test('built packs share one head and return supplied evidence only, with null on empty text', async () => {
  const head = JSON.parse(await readFile('public/models/question-matcher.json'));
  assert.deepEqual(head.featureNames, featureNames);
  assert.equal(head.weights.length, featureNames.length);
  assert.ok(!head.labels);
  for (const category of productCategories) {
    const pack = JSON.parse(await readFile(`public/taxonomy/${category.id}.json`));
    assert.equal(pack.taxonomyFingerprint, head.taxonomyFingerprint);
    assert.equal(pack.encoderFingerprint, head.encoderFingerprint);
    assert.deepEqual(pack.descriptors.map(d => d.id), category.descriptors);
    for (const d of pack.descriptors) assert.equal(d.vectors.question.length, 384);
    assert.ok(answerQuestions([], [], pack.descriptors, head).every(a => !a.detected && a.answer === null));
    const d = pack.descriptors[0];
    const result = answerQuestions([d.examples[0]], [d.vectors.examples[0]], [{ ...d, id: 'runtime-new-id' }], head)[0];
    assert.equal(result.id, 'runtime-new-id');
    assert.ok(result.answer === null || result.answer === d.examples[0]);
  }
});

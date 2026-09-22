import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { splitText, aggregate, scoreEmbedding } from '../src/classifier.js';
test('sentences, list items, and long descriptions retain trailing details', () => {
  const chunks = splitText('Solid oak.\nWipe clean.\n' + 'word '.repeat(160) + 'seat is 18 inches high');
  assert.equal(chunks[0], 'Solid oak.');
  assert.equal(chunks[1], 'Wipe clean.');
  assert.ok(chunks.at(-1).endsWith('seat is 18 inches high'));
  assert.deepEqual(splitText(' \n '), []);
});
test('aggregation allows multiple labels and returns evidence; empty input clears all', () => {
  const head = { labels: ['Material', 'Style'], thresholds: [.6, .7] };
  const results = aggregate(['Rustic oak', 'Hello'], [[.9, .8], [.1, .2]], head);
  assert.ok(results.every(r => r.detected && r.evidence === 'Rustic oak'));
  assert.ok(aggregate([], [], head).every(r => !r.detected && r.evidence === ''));
});
test('mixed details become separate candidates without breaking short lists or questions', () => {
  const parts = splitText('The cabinet measures 85 inches high and supports up to 150 pounds.');
  assert.ok(parts.includes('The cabinet measures 85 inches high'));
  assert.ok(parts.includes('supports up to 150 pounds.'));
  const styles = 'It pairs well with modern, farmhouse, rustic, and minimalist decor.';
  assert.deepEqual(splitText(styles), [styles]);
  const question = 'Does it include hardware, and does it support 100 pounds?';
  assert.deepEqual(splitText(question), [question]);
  assert.ok(splitText('Holds 1,000 pounds, with a reinforced base.').some(s => s.includes('1,000')));
});
test('trained artifact has a complete, finite 16-label head', async () => {
  const head = JSON.parse(await readFile(new URL('../public/models/classifier.json', import.meta.url)));
  assert.equal(head.labels.length, 16);
  assert.equal(new Set(head.labels).size, 16);
  assert.ok(head.weights.every(w => w.length === 384 && w.every(Number.isFinite)));
  assert.ok(head.thresholds.every(t => t > 0 && t < 1));
  assert.ok(scoreEmbedding(new Array(384).fill(0), head).every(p => p >= 0 && p <= 1));
});
test('USE has separate 512-dimensional weights with the same label schema', async () => {
  const use = JSON.parse(await readFile(new URL('../public/models/classifier-use.json', import.meta.url)));
  const mini = JSON.parse(await readFile(new URL('../public/models/classifier.json', import.meta.url)));
  assert.equal(use.encoder, 'use');
  assert.equal(use.dimension, 512);
  assert.deepEqual(use.labels, mini.labels);
  assert.ok(use.weights.every(w => w.length === 512 && w.every(Number.isFinite)));
  assert.equal(use.training.examples, mini.training.examples);
  assert.equal(use.training.validationExamples, mini.training.validationExamples);
  assert.ok(scoreEmbedding(new Array(512).fill(0), use).every(Number.isFinite));
});

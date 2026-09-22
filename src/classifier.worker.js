import { splitText } from './classifier.js';
import { answerQuestions } from './question-matcher.js';
let embed, head, pending, ready, processing = false;
const cache = new Map(), profiles = new Map();
async function json(path) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Model data missing. Run pnpm model:setup and pnpm model:train, then reload.');
  return response.json();
}
async function init() {
  head = await json('/models/question-matcher.json');
  const { pipeline, env } = await import('@huggingface/transformers');
  env.allowRemoteModels = false; env.allowLocalModels = true; env.localModelPath = '/models/';
  env.backends.onnx.wasm.wasmPaths = '/wasm/'; env.backends.onnx.wasm.numThreads = 1;
  const extractor = await pipeline('feature-extraction', 'encoder', { device: 'wasm', dtype: 'q8' });
  embed = async text => (await extractor(text, { pooling: 'mean', normalize: true })).data;
  await embed('Ready.');
  self.postMessage({ type: 'ready' });
}
async function categoryProfile(category) {
  if (!/^[a-z_]+$/.test(category)) throw new Error('Invalid product type.');
  if (!profiles.has(category)) {
    const profile = await json(`/taxonomy/${category}.json`);
    if (profile.encoderFingerprint !== head.encoderFingerprint || profile.taxonomyFingerprint !== head.taxonomyFingerprint) throw new Error('Taxonomy and model versions differ. Run pnpm model:train and reload.');
    profiles.set(category, profile);
    if (profiles.size > 3) profiles.delete(profiles.keys().next().value);
  }
  return profiles.get(category);
}
self.onmessage = ({ data }) => {
  if (data.type === 'init') {
    if (!ready) { ready = init(); ready.catch(error => self.postMessage({ type: 'error', message: error.message })); }
    return;
  }
  if (!ready) return;
  pending = data;
  if (!processing) void run();
};
async function run() {
  processing = true;
  try {
    await ready;
    while (pending) {
      const { id, text, category } = pending; pending = null;
      const start = performance.now();
      const profile = await categoryProfile(category);
      self.postMessage({ type: 'profile', category, descriptors: profile.descriptors.map(({ vectors, ...d }) => d) });
      const segments = splitText(text), vectors = [];
      for (const segment of segments) {
        if (pending) break;
        if (!cache.has(segment)) {
          cache.set(segment, await embed(segment));
          if (cache.size > 500) cache.delete(cache.keys().next().value);
        }
        vectors.push(cache.get(segment));
      }
      if (!pending) self.postMessage({ type: 'result', id, category, results: answerQuestions(segments, vectors, profile.descriptors, head), ms: Math.round(performance.now() - start) });
    }
  } catch (error) { self.postMessage({ type: 'error', message: error.message }); }
  finally { processing = false; }
}

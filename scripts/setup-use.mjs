import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
const directory = 'public/models/use';
await mkdir(directory, { recursive: true });
const modelUrl = 'https://tfhub.dev/tensorflow/tfjs-model/universal-sentence-encoder-lite/1/default/1/model.json?tfjs-format=file';
const vocabUrl = 'https://storage.googleapis.com/tfjs-models/savedmodel/universal_sentence_encoder/vocab.json';
async function download(url, target) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const data = new Uint8Array(await response.arrayBuffer());
  await writeFile(target, data);
  console.log(`${target}: ${(data.length / 1e6).toFixed(2)} MB`);
  return { url: response.url, data };
}
const { data } = await download(modelUrl, `${directory}/model.json`);
const model = JSON.parse(new TextDecoder().decode(data));
for (const file of model.weightsManifest.flatMap(group => group.paths)) {
  if (path.basename(file) !== file) throw new Error('Unexpected model shard path');
  const shardUrl = new URL(file, modelUrl);
  shardUrl.search = '?tfjs-format=file';
  await download(shardUrl.href, `${directory}/${file}`);
}
await download(vocabUrl, `${directory}/vocab.json`);
const require = createRequire(import.meta.url);
const wasmDist = path.dirname(require.resolve('@tensorflow/tfjs-backend-wasm'));
await mkdir('public/tfjs-wasm', { recursive: true });
for (const file of ['tfjs-backend-wasm.wasm', 'tfjs-backend-wasm-simd.wasm', 'tfjs-backend-wasm-threaded-simd.wasm']) await copyFile(path.join(wasmDist, file), `public/tfjs-wasm/${file}`);
const files = ['model.json', 'vocab.json', ...model.weightsManifest.flatMap(group => group.paths)];
const assets = [];
for (const file of files) { const bytes = await readFile(`${directory}/${file}`); assets.push({ file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }); }
await writeFile('public/models/use-source.json', JSON.stringify({ name: 'Universal Sentence Encoder Lite', modelUrl, vocabUrl, dimension: 512, license: 'Apache-2.0', assets }, null, 2));
console.log('USE Lite downloaded for fully local loading.');

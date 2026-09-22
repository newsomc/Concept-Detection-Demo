import { mkdir, writeFile, readFile, readdir, copyFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const repository = 'Xenova/paraphrase-MiniLM-L3-v2';
// A pinned upstream revision is recorded on first setup for reproducibility.
let revision;
try { const source = JSON.parse(await readFile(path.join(root, 'public/models/source.json'))); if (source.repository === repository) revision = source.revision; } catch {}
if (!revision) revision = await fetch(`https://huggingface.co/api/models/${repository}`).then(r => { if (!r.ok) throw new Error(`Model metadata: ${r.status}`); return r.json(); }).then(info => info.sha);
for (const file of ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'onnx/model_quantized.onnx']) {
  const target = path.join(root, 'public/models/encoder', file);
  try { if ((await stat(target)).size > 0) { console.log(`Already available: ${file}`); continue; } } catch {}
  console.log(`Downloading ${file}`);
  const response = await fetch(`https://huggingface.co/${repository}/resolve/${revision}/${file}`);
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, new Uint8Array(await response.arrayBuffer()));
}
// Resolve the exact transitive runtime used by Transformers.js, including pnpm layouts.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const transformerRequire = createRequire(require.resolve('@huggingface/transformers'));
const runtimeDist = path.dirname(transformerRequire.resolve('onnxruntime-web'));
await mkdir(path.join(root, 'public/wasm'), { recursive: true });
for (const file of await readdir(runtimeDist)) {
  if (file.endsWith('.wasm') || file.startsWith('ort-wasm') && file.endsWith('.mjs')) await copyFile(path.join(runtimeDist, file), path.join(root, 'public/wasm', file));
}
await writeFile(path.join(root, 'public/models/source.json'), JSON.stringify({ repository, revision, license: 'Apache-2.0', source: `https://huggingface.co/${repository}`, encoder: '17.4M parameters; q8 ONNX', note: 'Frozen pretrained semantic encoder; task-specific supervised head trained separately.' }, null, 2));
console.log('Model and WASM assets are available locally. Run pnpm model:train next.');

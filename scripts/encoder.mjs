import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function createEncoder(name = 'minilm') {
  if (name === 'use') {
    const tf = await import('@tensorflow/tfjs');
    // tfjs fetches the graph, shards and vocabulary through this platform API.
    // Read only this project's local model files; training cannot fetch remotely.
    const root = new URL('../public/models/use/', import.meta.url);
    tf.env().platform.fetch = async url => {
      const target = new URL(String(url));
      if (!target.href.startsWith(root.href)) throw new Error(`Non-local USE resource blocked: ${target.protocol}`);
      return new Response(await readFile(target));
    };
    const { createUseEncoder } = await import('../src/use-encoder.js');
    return createUseEncoder({ modelUrl: new URL('model.json', root).href, vocabUrl: new URL('vocab.json', root).href, wasmPath: fileURLToPath(new URL('../public/tfjs-wasm/', import.meta.url)) });
  }
  if (name !== 'minilm') throw new Error(`Unknown encoder: ${name}`);
  const { pipeline, env } = await import('@huggingface/transformers');
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = fileURLToPath(new URL('../public/models/', import.meta.url));
  const model = await pipeline('feature-extraction', 'encoder', { dtype: 'q8', device: 'cpu' });
  return async text => Array.from((await model(text, { pooling: 'mean', normalize: true })).data);
}

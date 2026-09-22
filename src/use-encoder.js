import * as tf from '@tensorflow/tfjs';
import { setWasmPaths, setThreadsCount } from '@tensorflow/tfjs-backend-wasm';
import * as use from '@tensorflow-models/universal-sentence-encoder';

export async function createUseEncoder({ modelUrl = '/models/use/model.json', vocabUrl = '/models/use/vocab.json', wasmPath = '/tfjs-wasm/' } = {}) {
  setWasmPaths(wasmPath);
  setThreadsCount(1);
  await tf.setBackend('wasm');
  await tf.ready();
  if (tf.getBackend() !== 'wasm') throw new Error('USE requires the local TensorFlow.js WASM backend.');
  const model = await use.load({ modelUrl, vocabUrl });
  return async text => {
    const tensor = await model.embed([text]);
    try {
      const vector = Array.from(await tensor.data());
      const norm = Math.hypot(...vector) || 1;
      return vector.map(value => value / norm);
    } finally { tensor.dispose(); }
  };
}

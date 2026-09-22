import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createReadStream, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// ONNX loads its generated Emscripten module verbatim. Vite must not transform it.
const localRuntime = {
  name: 'local-onnx-runtime',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const pathname = (req.url || '').split('?')[0];
      if (!/^\/wasm\/ort-wasm[\w.-]+\.mjs$/.test(pathname)) return next();
      const path = fileURLToPath(new URL(`./public${pathname}`, import.meta.url));
      if (!existsSync(path)) return next();
      res.setHeader('Content-Type', 'text/javascript');
      createReadStream(path).pipe(res);
    });
  },
};
export default defineConfig({ plugins: [react(), localRuntime], worker: { format: 'es' }, server: { port: 5173, strictPort: true } });

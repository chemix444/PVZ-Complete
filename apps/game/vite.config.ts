import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the same build works at a domain root or under a
  // subpath such as https://<user>.github.io/PVZ-Complete/.
  base: './',
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
});

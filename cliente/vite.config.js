import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El cliente (5173) le pide datos y rutas al servidor Express (3000).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000', '/data': 'http://localhost:3000' } },
});

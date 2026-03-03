import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['@marsidev/react-turnstile'],
  },
  server: {
    host: '0.0.0.0',
    port: 13000,
    allowedHosts: ['aegis.heliannuuthus.com', 'iris.heliannuuthus.com'],
    hmr: false,
    proxy: {
      '/api': {
        target: 'https://aegis.heliannuuthus.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});

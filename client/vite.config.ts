/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    // Dev requests to /api go straight to the API server, so the browser sees
    // one origin and CORS never enters the picture during development.
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_PROXY || 'http://localhost:5000',
        changeOrigin: true
      },
      '/socket.io': {
        target: process.env.VITE_DEV_API_PROXY || 'http://localhost:5000',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Split the heavy, rarely-changing libraries out of the app bundle so a
        // code change does not invalidate the whole cached payload.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false
  }
});

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
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Every source file counts, not only the ones a test happens to import.
      // Reporting on the imported set alone would flatter the number and, more
      // to the point, would still read as a pass if the suite ran nothing.
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/main.tsx', 'src/types/**', 'src/**/*.test.{ts,tsx}'],
      // Set just under the current figures, measured across all of src rather
      // than the files a test happens to import. The floor is not a quality bar;
      // it is here for the case a floor is uniquely good at catching: a suite
      // that exits 0 having run nothing, which reports as a pass everywhere else.
      thresholds: {
        statements: 50,
        branches: 55,
        functions: 45,
        lines: 52
      }
    }
  }
});

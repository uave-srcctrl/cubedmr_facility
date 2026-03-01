import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'tests/**/*.spec.ts',
      'tests/**/*.spec.tsx'
    ],
    exclude: [
      'node_modules',
      'dist',
      'copilot-analysis'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'copilot-analysis/',
        '**/*.d.ts',
        'vite*.ts',
        'drizzle.config.ts'
      ]
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    // Reporter
    reporters: ['verbose', 'json'],
    outputFile: './tests/results.json'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@server': path.resolve(__dirname, './server')
    }
  }
});

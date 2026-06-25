import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/**/*.types.ts', 'src/**/*.validation.ts'],
    },
  },
  resolve: {
    alias: {
      '@modules':  path.resolve(__dirname, 'src/modules'),
      '@shared':   path.resolve(__dirname, 'src/shared'),
      '@config':   path.resolve(__dirname, 'src/config'),
      '@database': path.resolve(__dirname, 'src/database'),
      '@socket':   path.resolve(__dirname, 'src/socket'),
    },
  },
});

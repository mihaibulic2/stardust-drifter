import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: { open: true, port: 5173 },
  build: { outDir: 'dist', target: 'es2020' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    globals: false,
  },
});

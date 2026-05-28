import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: false,
    globals: true,
    // Playwright specs live in e2e/ and use @playwright/test; exclude them.
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e'],
  },
});

import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

function getPreviewHeaders(): Record<string, string> {
  try {
    const raw = readFileSync(new URL('./vercel.json', import.meta.url), 'utf-8');
    const vercel = JSON.parse(raw) as {
      headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    };
    const block = vercel.headers?.[0];
    if (!block) return {};
    return Object.fromEntries(block.headers.map((h) => [h.key, h.value]));
  } catch {
    return {};
  }
}

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'vendor';
          }
        },
      },
    },
  },
  preview: {
    headers: getPreviewHeaders(),
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      include: ['src/**', 'shared/**', 'server/**', 'api/**'],
      exclude: ['src/main.tsx'],
      thresholds: {
        statements: 90,
        lines: 90,
        functions: 85,
        branches: 80,
      },
    },
  },
});

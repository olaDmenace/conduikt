import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        '.next/',
        'src/__tests__/',
        'e2e/',
        '**/*.config.*',
        '**/types.ts',
        '**/registry.ts',
      ],
    },
    testTimeout: 15000,
    exclude: ['**/node_modules/**', '**/e2e/**', '**/.git/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})

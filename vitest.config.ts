import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// Shared exclude for both projects below.
const exclude = ['**/node_modules/**', '**/e2e/**', '**/.git/**']

// Pure-logic tests that run in node, which skips the jsdom boot per file.
// The extglob keeps ui-store.test.ts out: the Zustand UI store writes the
// theme to `document.documentElement`, so that one still needs jsdom. Any
// other test under these paths that turns out to need a DOM goes in the
// same `!(…)` list rather than getting a pragma added to it.
const NODE_GLOBS = ['src/lib/**/*.test.ts', 'src/__tests__/unit/**/!(ui-store).test.ts']

export default defineConfig({
  plugins: [react()],
  test: {
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
    exclude,
    // Two environments. Library modules and unit tests that never render
    // React run in node; component, integration and every .tsx test keep
    // jsdom. A file that declares its own `// @vitest-environment` pragma
    // still wins over the project default, whichever project it lands in.
    // Vitest 4 removed `environmentMatchGlobs`; `projects` is the replacement.
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: NODE_GLOBS,
          exclude,
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [...exclude, ...NODE_GLOBS],
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})

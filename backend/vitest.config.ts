import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: false,
      },
    },
  },
  test: {
    environment: 'node',
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000,
    setupFiles: ['./tests/setup.ts'],
  },
})

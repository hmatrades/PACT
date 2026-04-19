import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'node18',
    outDir: 'dist',
    splitting: false,
    shims: true,
  },
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: false,
    target: 'node18',
    outDir: 'dist',
    splitting: false,
    shims: true,
    banner: { js: '#!/usr/bin/env node' },
  },
])

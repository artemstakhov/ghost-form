import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'], // Output CommonJS and ESM
  dts: true, // Generate declaration files
  splitting: false,
  sourcemap: true,
  clean: true, // Clean dist folder before build
  treeshake: true,
  minify: false, // Usually libraries aren't minified to keep readable stack traces, user's bundler handles minification
  external: ['react'], // Ensure React is not bundled
});

import { defineConfig } from 'tsdown'

const PKG_ID = 'dsh-ui-deepseek-balance'

export default defineConfig([
  // Host half: ESM Node library (runs inside the dsh harness process).
  {
    name: PKG_ID,
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    dts: true,
    clean: false,
    external: [/^node:/],
  },
  // Browser half: dsh client bundle (closure-factory artifact served by
  // client-modules at /plugins/<id>/client.js; externals resolve from the
  // app's module table at load time).
  {
    name: PKG_ID + '/client',
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    dts: false,
    clean: false,
    sourcemap: true,
    external: ['react', 'react/jsx-runtime'],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: 'window.__ModuleLoader__.load({ id: ' + JSON.stringify(PKG_ID) + ', factory: (require) => {',
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])

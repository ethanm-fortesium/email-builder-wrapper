import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const waypointBlocksRoot = path.resolve(__dirname, 'node_modules/@usewaypoint');

// Unified config: dev serves index.html as usual; build outputs a single UMD bundle for the web component.
export default defineConfig(({ command }) => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@usewaypoint/block-avatar': path.join(waypointBlocksRoot, 'block-avatar/dist/index.js'),
        '@usewaypoint/block-button': path.join(waypointBlocksRoot, 'block-button/dist/index.js'),
        '@usewaypoint/block-divider': path.join(waypointBlocksRoot, 'block-divider/dist/index.js'),
        '@usewaypoint/block-heading': path.join(waypointBlocksRoot, 'block-heading/dist/index.js'),
        '@usewaypoint/block-html': path.join(waypointBlocksRoot, 'block-html/dist/index.js'),
        '@usewaypoint/block-image': path.join(waypointBlocksRoot, 'block-image/dist/index.js'),
        '@usewaypoint/block-spacer': path.join(waypointBlocksRoot, 'block-spacer/dist/index.js'),
        '@usewaypoint/block-text': path.join(waypointBlocksRoot, 'block-text/dist/index.js'),
        '@usewaypoint/block-container': path.join(waypointBlocksRoot, 'block-container/dist/index.js'),
        '@usewaypoint/block-columns-container': path.join(waypointBlocksRoot, 'block-columns-container/dist/index.js'),
        '@usewaypoint/document-core': path.join(waypointBlocksRoot, 'document-core/dist/index.js'),
      },
    },
    build: {
      lib: {
        entry: './src/web-component.tsx',
        name: 'EmailBuilderEditor',
        formats: ['umd'],
        fileName: () => 'emailbuilder-editor.umd.js',
      },
      rollupOptions: {
        external: [],
        output: {
          inlineDynamicImports: true,
        },
      },
      sourcemap: true,
      minify: 'esbuild',
      chunkSizeWarningLimit: 6000, 
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(command === 'build' ? 'production' : 'development'),
    },
  };
});

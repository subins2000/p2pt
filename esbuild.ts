import { build } from 'esbuild';

// Node.js 
build({
  entryPoints: [
    'src/p2pt.ts'
  ],
  outfile: 'dist/node.js',
  minify: true,
  bundle: false,
  platform: 'node',
  sourcemap: 'external'
}).catch(e => {
  console.log(e);
  process.exit(1);
});

// Browser 
build({
  entryPoints: [
    'src/p2pt.ts'
  ],
  outfile: 'dist/p2pt.js',
  minify: true,
  bundle: true,
  inject: [
    'esbuild.inject.js'
  ],
  sourcemap: 'external'
}).catch(e => {
  console.log(e);
  process.exit(1);
});


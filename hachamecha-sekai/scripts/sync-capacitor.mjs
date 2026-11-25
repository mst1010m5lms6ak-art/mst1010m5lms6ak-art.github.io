import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'www');
const items = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'icons',
  'css',
  'js'
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const item of items) {
  const src = path.join(root, item);
  const dst = path.join(outDir, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dst, { recursive: true });
  }
}

console.log('Capacitor webDir (www/) synced successfully.');

import { readdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const distDir = join(process.cwd(), 'dist');
const publicDir = join(process.cwd(), 'public');

if (!existsSync(distDir)) {
  console.log('dist/ not found, skipping SW manifest generation');
  process.exit(0);
}

function getFiles(dir, base = '') {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : `/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...getFiles(join(dir, entry.name), rel));
    } else if (!entry.name.endsWith('.map')) {
      files.push(rel);
    }
  }
  return files;
}

const files = getFiles(distDir);
const manifest = `self.__SW_MANIFEST = ${JSON.stringify(files, null, 2)};`;
writeFileSync(join(publicDir, 'sw-manifest.js'), manifest);
console.log(`Generated SW manifest with ${files.length} assets`);

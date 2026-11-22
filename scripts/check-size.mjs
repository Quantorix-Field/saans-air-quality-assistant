import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import process from 'node:process';

const DIST_ASSETS = join(process.cwd(), 'dist', 'assets');
const JS_LIMIT = 150 * 1024;   // 150 KB gzip
const CSS_LIMIT = 30 * 1024;   // 30 KB gzip

const files = await readdir(DIST_ASSETS);

let totalJs = 0;
let totalCss = 0;

for (const file of files) {
  if (!file.endsWith('.js') && !file.endsWith('.css')) continue;
  const content = await readFile(join(DIST_ASSETS, file));
  const gz = gzipSync(content);
  const kb = (gz.length / 1024).toFixed(2);
  if (file.endsWith('.js')) {
    totalJs += gz.length;
    console.warn(`JS  ${file}: ${kb} KB (gzip)`);
  } else {
    totalCss += gz.length;
    console.warn(`CSS ${file}: ${kb} KB (gzip)`);
  }
}

const totalJsKb = (totalJs / 1024).toFixed(2);
const totalCssKb = (totalCss / 1024).toFixed(2);
console.warn(`Total JS:  ${totalJsKb} KB gzip (limit ${JS_LIMIT / 1024} KB)`);
console.warn(`Total CSS: ${totalCssKb} KB gzip (limit ${CSS_LIMIT / 1024} KB)`);

if (totalJs > JS_LIMIT) {
  console.error(`FAIL: Total JS ${totalJsKb} KB exceeds ${JS_LIMIT / 1024} KB limit`);
  process.exit(1);
}
if (totalCss > CSS_LIMIT) {
  console.error(`FAIL: Total CSS ${totalCssKb} KB exceeds ${CSS_LIMIT / 1024} KB limit`);
  process.exit(1);
}

console.warn('Size check passed.');

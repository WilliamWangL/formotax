/**
 * Copies the PDF.js worker next to the app so the browser can load it from
 * /pdf.worker.min.mjs. Runs on predev and prebuild.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(appRoot, 'public');

const source = join(dirname(require.resolve('pdfjs-dist/package.json')), 'build/pdf.worker.min.mjs');
const target = join(publicDir, 'pdf.worker.min.mjs');

if (!existsSync(source)) {
  console.error(`PDF.js worker not found at ${source}. Run pnpm install first.`);
  process.exit(1);
}

mkdirSync(publicDir, { recursive: true });
copyFileSync(source, target);
console.log('PDF.js worker ready at public/pdf.worker.min.mjs');

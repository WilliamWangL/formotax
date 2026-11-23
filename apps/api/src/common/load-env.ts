import fs from 'node:fs';
import path from 'node:path';

/**
 * Load the nearest `.env` file walking up from the working directory.
 *
 * The monorepo keeps a single environment file at its root, shared by the web
 * app, the API and the Prisma CLI. Containers inject variables directly and may
 * not ship a file at all, so a missing file is not an error. Values already set
 * in `process.env` always win.
 */
function loadNearestEnvFile(): void {
  let dir = process.cwd();

  for (let depth = 0; depth < 4; depth += 1) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) {
      try {
        process.loadEnvFile(candidate);
      } catch {
        // A malformed file should not stop the process from starting.
      }
      return;
    }

    const parent = path.dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

loadNearestEnvFile();

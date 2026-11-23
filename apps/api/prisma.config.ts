import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

const here = path.dirname(fileURLToPath(import.meta.url));

// The monorepo keeps a single .env at the repository root. Loading it here keeps
// `prisma migrate` / `prisma db seed` in sync with what the API process reads.
try {
  process.loadEnvFile(path.resolve(here, '../../.env'));
} catch {
  // Docker images inject the variables directly, so a missing file is fine.
}

export default defineConfig({
  schema: path.join(here, 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join(here, 'prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
});

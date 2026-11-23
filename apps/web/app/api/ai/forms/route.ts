import { buildAiCatalog } from '@tax/tax-form-engine';
import { siteConfig } from '@/lib/site';

export const dynamic = 'force-static';

export function GET() {
  const catalog = buildAiCatalog(siteConfig.url);

  return Response.json(catalog, {
    headers: {
      // Public, read-only data: allow browser-based agents to fetch it directly.
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}

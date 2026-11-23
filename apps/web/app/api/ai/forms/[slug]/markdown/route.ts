import { formToMarkdown, getFormBySlug, listForms } from '@tax/tax-form-engine';
import { siteConfig } from '@/lib/site';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return listForms().map((form) => ({ slug: form.slug }));
}

export function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return params.then(({ slug }) => {
    const form = getFormBySlug(slug);
    if (!form) {
      return new Response(`# Not found\n\nNo form matches "${slug}".\n`, {
        status: 404,
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
      });
    }

    return new Response(formToMarkdown(form, siteConfig.url), {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        Link: `<${siteConfig.url}${form.seo.landingPath}>; rel="canonical"`,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  });
}

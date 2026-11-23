import { fillPath, getFormBySlug, listForms, toSummary } from '@tax/tax-form-engine';
import { siteConfig } from '@/lib/site';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return listForms().map((form) => ({ slug: form.slug }));
}

export function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return params.then(({ slug }) => {
    const form = getFormBySlug(slug);
    if (!form) {
      return Response.json({ error: 'not_found', message: `No form matches "${slug}".` }, { status: 404 });
    }

    const payload = {
      ...toSummary(form),
      version: form.version,
      language: form.language,
      category: form.category,
      lastReviewed: form.lastReviewed,
      officialUrl: form.officialUrl,
      instructionsUrl: form.instructionsUrl,
      templateUrl: `${siteConfig.url}${form.pdf.path}`,
      templateRevision: form.pdf.revision,
      templateSha256: form.pdf.sha256,
      fillUrl: `${siteConfig.url}${fillPath(form)}`,
      markdownUrl: `${siteConfig.url}/api/ai/forms/${form.slug}/markdown`,
      privacy: 'Answers and signatures are processed in the browser and are not uploaded.',
      steps: form.steps.map((step, index) => ({
        order: index + 1,
        id: step.id,
        title: step.title,
        subtitle: step.subtitle ?? null,
        fields: step.fields.map((field) => ({
          name: field.name,
          label: field.label,
          type: field.type,
          required: field.required ?? false,
          help: field.help ?? null,
          options: field.options ?? null,
        })),
      })),
      faq: form.seo.faq,
      sections: form.seo.sections,
      disclaimers: form.disclaimers,
    };

    return Response.json(payload, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        // Point crawlers and agents at the canonical HTML page for this data.
        Link: `<${siteConfig.url}${form.seo.landingPath}>; rel="canonical"`,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  });
}

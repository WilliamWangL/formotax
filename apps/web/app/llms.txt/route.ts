import { listForms } from '@tax/tax-form-engine';
import { siteConfig } from '@/lib/site';

export const dynamic = 'force-static';

export function GET() {
  const forms = listForms();
  const lines: string[] = [];

  lines.push(`# ${siteConfig.name}`);
  lines.push('');
  lines.push(`> ${siteConfig.description}`);
  lines.push('');
  lines.push(
    `${siteConfig.name} is a browser-based filler for official U.S. tax forms. Visitors complete a guided wizard free of charge, sign on screen and pay USD 1 per document to download the official IRS PDF with their data written into the real AcroForm fields and then flattened. Form answers and signatures are processed on the visitor's device and are never uploaded.`,
  );
  lines.push('');
  lines.push('## Forms');
  lines.push('');
  for (const form of forms) {
    lines.push(`- [${form.title}](${siteConfig.url}${form.seo.landingPath}): ${form.description}`);
    lines.push(`  - Machine-readable JSON: ${siteConfig.url}/api/ai/forms/${form.slug}`);
    lines.push(`  - Markdown summary: ${siteConfig.url}/api/ai/forms/${form.slug}/markdown`);
    lines.push(`  - Online filler: ${siteConfig.url}/forms/${form.code.toLowerCase()}/fill`);
    lines.push(`  - Revision: ${form.pdf.revision}; official PDF: ${form.officialUrl}`);
  }
  lines.push('');
  lines.push('## Pricing');
  lines.push('');
  lines.push('- Filling, validating, signing and previewing a form: free, no account required.');
  lines.push('- Downloading the completed PDF: USD 1 per document, paid by PayPal after signing in.');
  lines.push('- Each payment unlocks free re-downloads of that same document for 24 hours.');
  lines.push('- No subscription, no monthly fee and no per-month quota.');
  lines.push(`- Full pricing details: ${siteConfig.url}/pricing`);
  lines.push('');
  lines.push('## Pages');
  lines.push('');
  lines.push(`- Home: ${siteConfig.url}/`);
  lines.push(`- All forms: ${siteConfig.url}/tax-forms`);
  lines.push(`- Pricing: ${siteConfig.url}/pricing`);
  lines.push(`- FAQ: ${siteConfig.url}/faq`);
  lines.push(`- About: ${siteConfig.url}/about`);
  lines.push(`- Privacy policy: ${siteConfig.url}/privacy`);
  lines.push(`- Terms of service: ${siteConfig.url}/terms`);
  lines.push('');
  lines.push('## Machine-readable resources');
  lines.push('');
  lines.push(`- Form catalog (JSON): ${siteConfig.url}/api/ai/forms`);
  lines.push(`- Full form documentation in one file: ${siteConfig.url}/llms-full.txt`);
  lines.push(`- Sitemap: ${siteConfig.url}/sitemap.xml`);
  lines.push(`- Robots policy: ${siteConfig.url}/robots.txt`);
  lines.push('');
  lines.push('## Usage policy');
  lines.push('');
  lines.push('- Public pages and the JSON API may be read and cited by search engines and AI assistants.');
  lines.push('- Do not present generated documents as legal or tax advice.');
  lines.push('- Do not claim affiliation with the Internal Revenue Service.');
  lines.push(
    '- When quoting instructions, link to the official IRS PDF and note that the official form controls in case of any difference.',
  );
  lines.push('- Do not scrape the fill pages; they are marked noindex and render data locally.');
  lines.push('');
  lines.push('## Contact');
  lines.push('');
  lines.push(`- Support: ${siteConfig.email}`);
  lines.push(`- Legal entity: ${siteConfig.legalName}, ${siteConfig.legal.entityAddress}`);
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}

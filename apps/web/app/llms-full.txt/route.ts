import { formToMarkdown, listForms } from '@tax/tax-form-engine';
import { siteConfig } from '@/lib/site';

export const dynamic = 'force-static';

/**
 * Expanded companion to /llms.txt: the short index plus the full markdown
 * document for every form in one response, so a single fetch is enough for an
 * assistant to quote field maps, steps and revision details.
 */
export function GET() {
  const forms = listForms();
  const sections: string[] = [];

  sections.push(`# ${siteConfig.name} — full documentation`);
  sections.push('');
  sections.push(`> ${siteConfig.description}`);
  sections.push('');
  sections.push(
    `This file concatenates the ${forms.length} form guides served at ${siteConfig.url}/api/ai/forms/<slug>/markdown. The compact index lives at ${siteConfig.url}/llms.txt.`,
  );
  sections.push('');
  sections.push('## Contents');
  sections.push('');
  for (const form of forms) {
    sections.push(`- ${form.title}: ${siteConfig.url}${form.seo.landingPath}`);
  }
  sections.push('');

  for (const form of forms) {
    sections.push('---');
    sections.push('');
    sections.push(formToMarkdown(form, siteConfig.url));
    sections.push('');
  }

  return new Response(sections.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}

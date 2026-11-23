import { notFound } from 'next/navigation';
import { FormLanding } from '@/features/seo/form-landing';
import { buildMetadata } from '@/lib/metadata';
import { getForm } from '@tax/tax-form-engine';

export const dynamicParams = false;

const GENERATOR_SLUGS: Record<string, string> = {
  'w9-form-generator': 'W9',
  'w-9-form-generator': 'W9',
  'w4-form-generator': 'W4',
  'w-4-form-generator': 'W4',
  'w8ben-form-generator': 'W8BEN',
  'w8bene-form-generator': 'W8BENE',
  'w8ben-e-form-generator': 'W8BENE',
};

export function generateStaticParams() {
  return Object.keys(GENERATOR_SLUGS).map((generator) => ({ generator }));
}

export async function generateMetadata({ params }: { params: Promise<{ generator: string }> }) {
  const { generator } = await params;
  const code = GENERATOR_SLUGS[generator];
  const form = code ? getForm(code) : undefined;
  if (!form) return {};
  return buildMetadata({
    title: form.seo.title,
    description: form.seo.description,
    path: form.seo.landingPath,
    keywords: form.seo.keywords,
    markdownPath: `/api/ai/forms/${form.slug}/markdown`,
  });
}

export default async function GeneratorPage({ params }: { params: Promise<{ generator: string }> }) {
  const { generator } = await params;
  const code = GENERATOR_SLUGS[generator];
  const form = code ? getForm(code) : undefined;
  if (!form) notFound();
  return <FormLanding form={form} />;
}

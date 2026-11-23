import { notFound } from 'next/navigation';
import { FormLanding } from '@/features/seo/form-landing';
import { buildMetadata } from '@/lib/metadata';
import { FORM_DEFINITIONS, getFormBySlug } from '@tax/tax-form-engine';

export const dynamicParams = false;

export function generateStaticParams() {
  return FORM_DEFINITIONS.map((form) => ({ slug: form.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = getFormBySlug(slug);
  if (!form) return {};
  return buildMetadata({
    title: form.seo.title,
    description: form.seo.description,
    path: form.seo.landingPath,
    keywords: form.seo.keywords,
    markdownPath: `/api/ai/forms/${form.slug}/markdown`,
  });
}

export default async function FormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = getFormBySlug(slug);
  if (!form) notFound();
  return <FormLanding form={form} />;
}

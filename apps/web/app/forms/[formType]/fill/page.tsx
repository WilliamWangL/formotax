import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { FormFiller } from '@/features/filler/form-filler';
import { buildMetadata } from '@/lib/metadata';
import { FORM_DEFINITIONS, getForm } from '@tax/tax-form-engine';

export const dynamicParams = false;

export function generateStaticParams() {
  return FORM_DEFINITIONS.map((form) => ({ formType: form.code.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ formType: string }>;
}): Promise<Metadata> {
  const { formType } = await params;
  const form = getForm(formType);
  if (!form) return {};
  return buildMetadata({
    title: `Fill ${form.shortTitle} online`,
    description: `Complete ${form.shortTitle} (${form.pdf.revision}) in a guided wizard, sign on screen and download the official IRS PDF.`,
    path: `/forms/${form.code.toLowerCase()}/fill`,
    keywords: form.seo.keywords,
    noIndex: true,
  });
}

export default async function FillPage({ params }: { params: Promise<{ formType: string }> }) {
  const { formType } = await params;
  const form = getForm(formType);
  if (!form) notFound();

  return (
    <div className="bg-slate-50/60">
      <FormFiller definition={form} />
    </div>
  );
}

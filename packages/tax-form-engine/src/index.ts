import type {
  AiFormCatalog,
  FormCode,
  FormDefinition,
  FormValues,
  TaxFormSummaryDto,
  ValidationResult,
} from '@tax/shared-types';
import { validateTaxForm } from '@tax/validation';
import { W9_FORM } from './configs/w9';
import { W4_FORM } from './configs/w4';
import { W8BEN_FORM } from './configs/w8ben';
import { W8BENE_FORM } from './configs/w8bene';

export { W9_FORM, W4_FORM, W8BEN_FORM, W8BENE_FORM };

export const FORM_DEFINITIONS: FormDefinition[] = [W9_FORM, W4_FORM, W8BEN_FORM, W8BENE_FORM];

export function listForms(): FormDefinition[] {
  return FORM_DEFINITIONS;
}

export function getForm(code: string): FormDefinition | undefined {
  const normalized = code.trim().toUpperCase().replace(/-/g, '');
  return FORM_DEFINITIONS.find((form) => form.code === normalized);
}

export function getFormBySlug(slug: string): FormDefinition | undefined {
  const normalized = slug.trim().toLowerCase();
  return FORM_DEFINITIONS.find((form) => form.slug === normalized);
}

export function getFormByCodeOrSlug(value: string): FormDefinition | undefined {
  return getForm(value) ?? getFormBySlug(value);
}

export function fillPath(form: FormDefinition): string {
  return `/forms/${form.code.toLowerCase()}/fill`;
}

export function toSummary(form: FormDefinition): TaxFormSummaryDto {
  return {
    code: form.code,
    slug: form.slug,
    title: form.title,
    shortTitle: form.shortTitle,
    description: form.description,
    agency: form.agency,
    country: form.country,
    revision: form.pdf.revision,
    audience: form.audience,
    estimatedMinutes: form.estimatedMinutes,
    landingPath: form.seo.landingPath,
    fillPath: fillPath(form),
  };
}

/** Current local date as yyyy-mm-dd, used for signature dates. */
export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

export function defaultValues(form: FormDefinition, now = new Date()): FormValues {
  const values: FormValues = {};
  for (const step of form.steps) {
    for (const field of step.fields) {
      if (field.type === 'checkbox' || field.type === 'signature') {
        values[field.name] = false;
        continue;
      }
      if (field.defaultValue === 'today') {
        values[field.name] = todayIso(now);
      } else if (field.defaultValue !== undefined) {
        values[field.name] = field.defaultValue;
      } else {
        values[field.name] = '';
      }
    }
  }
  return values;
}

/** Drops values for fields hidden by the current answers. */
export function pruneHiddenValues(form: FormDefinition, values: FormValues): FormValues {
  const result: FormValues = { ...values };
  for (const step of form.steps) {
    for (const field of step.fields) {
      if (field.visibleWhen) {
        const visible = evaluateVisibility(field.visibleWhen, values);
        if (!visible) delete result[field.name];
      }
    }
  }
  return result;
}

function evaluateVisibility(
  condition: NonNullable<FormDefinition['steps'][number]['fields'][number]['visibleWhen']>,
  values: FormValues,
): boolean {
  const current = values[condition.field];
  if (condition.truthy !== undefined && Boolean(current) !== condition.truthy) return false;
  if (condition.equals !== undefined && current !== condition.equals) return false;
  if (condition.notEquals !== undefined && current === condition.notEquals) return false;
  if (condition.in && !condition.in.includes(current as string | number | boolean)) return false;
  return true;
}

/** Only values with a PDF binding should be sent to the PDF engine. */
export function pdfValues(form: FormDefinition, values: FormValues): FormValues {
  const pruned = pruneHiddenValues(form, values);
  const bound = new Set([
    ...Object.keys(form.pdf.fields),
    ...Object.keys(form.pdf.optionGroups),
    'signatureDate',
    'printedName',
  ]);
  const result: FormValues = {};
  for (const [key, value] of Object.entries(pruned)) {
    if (bound.has(key)) result[key] = value;
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Cross-field business rules                                          */
/* ------------------------------------------------------------------ */

type BusinessRules = (values: FormValues) => Record<string, string>;

const W9_RULES: BusinessRules = (values) => {
  const errors: Record<string, string> = {};
  const tinType = String(values.tinType ?? '');
  if (tinType === 'ssn' && !String(values.ssn ?? '').trim()) {
    errors.ssn = 'A social security number is required when SSN is selected.';
  }
  if (tinType === 'ein' && !String(values.ein ?? '').trim()) {
    errors.ein = 'An employer identification number is required when EIN is selected.';
  }
  if (values.taxClassification === 'llc' && !values.llcCode) {
    errors.llcCode = 'Enter the LLC tax classification code (C, S or P).';
  }
  if (values.taxClassification === 'other' && !String(values.otherClassification ?? '').trim()) {
    errors.otherClassification = 'Describe the other tax classification.';
  }
  return errors;
};

const W4_RULES: BusinessRules = (values) => {
  const errors: Record<string, string> = {};
  const ssn = String(values.ssn ?? '').trim();
  if (!ssn) errors.ssn = 'A social security number is required for Form W-4.';

  const qualifying = Number(values.qualifyingChildrenAmount ?? 0) || 0;
  const other = Number(values.otherDependentsAmount ?? 0) || 0;
  const total = String(values.totalDependents ?? '').trim();
  if (total && qualifying + other > 0) {
    const declared = Number(total.replace(/,/g, ''));
    if (!Number.isNaN(declared) && Math.abs(declared - (qualifying + other)) > 0.005) {
      errors.totalDependents = `Step 3 total should equal Step 3(a) + 3(b) (${(
        qualifying + other
      ).toFixed(2)}).`;
    }
  }
  return errors;
};

const W8BEN_RULES: BusinessRules = (values) => {
  const errors: Record<string, string> = {};
  const usTin = String(values.usTin ?? '').trim();
  if (usTin && usTin.replace(/\D+/g, '').length !== 9) {
    errors.usTin = 'A U.S. TIN must contain 9 digits.';
  }
  if (!values.ftinNotRequired && !String(values.foreignTin ?? '').trim()) {
    errors.foreignTin = 'Enter a foreign TIN or check line 6b if one is not legally required.';
  }
  if (values.claimTreaty) {
    if (!values.treatyCountry) errors.treatyCountry = 'Select the treaty country.';
    if (!values.treatyArticle) errors.treatyArticle = 'Enter the treaty article and paragraph.';
    if (values.withholdingRate === undefined || values.withholdingRate === '') {
      errors.withholdingRate = 'Enter the withholding rate claimed.';
    }
  }
  return errors;
};

const W8BENE_RULES: BusinessRules = (values) => {
  const errors: Record<string, string> = {};
  const usTin = String(values.usTin ?? '').trim();
  if (usTin && usTin.replace(/\D+/g, '').length !== 9) {
    errors.usTin = 'A U.S. TIN must contain 9 digits.';
  }
  if (!values.ftinNotRequired && !String(values.foreignTin ?? '').trim()) {
    errors.foreignTin = 'Enter a foreign TIN or check line 9c if one is not legally required.';
  }
  if (values.claimTreaty) {
    if (!values.treatyCountry) errors.treatyCountry = 'Select the treaty country.';
    if (!values.limitationOption) {
      errors.limitationOption = 'Select the limitation on benefits provision claimed.';
    }
    if (!values.treatyArticle) errors.treatyArticle = 'Enter the treaty article and paragraph.';
    if (values.withholdingRate === undefined || values.withholdingRate === '') {
      errors.withholdingRate = 'Enter the withholding rate claimed.';
    }
  }
  return errors;
};

const BUSINESS_RULES: Record<FormCode, BusinessRules> = {
  W9: W9_RULES,
  W4: W4_RULES,
  W8BEN: W8BEN_RULES,
  W8BENE: W8BENE_RULES,
};

export interface ValidateOptions {
  signatureCaptured?: boolean;
  signatureRequired?: boolean;
}

export function validateForm(
  form: FormDefinition,
  values: FormValues,
  options: ValidateOptions = {},
): ValidationResult {
  const signatureField = form.steps
    .flatMap((step) => step.fields)
    .find((field) => field.type === 'signature');

  return validateTaxForm(form, values, {
    businessRules: BUSINESS_RULES[form.code],
    signature: {
      fieldName: signatureField?.name ?? 'signature',
      captured: options.signatureCaptured,
      required: options.signatureRequired,
    },
  });
}

/* ------------------------------------------------------------------ */
/* AI / markdown output                                                */
/* ------------------------------------------------------------------ */

export function formToMarkdown(form: FormDefinition, siteUrl = 'https://formotax.ecommica.com'): string {
  const lines: string[] = [];
  lines.push(`# ${form.title}`);
  lines.push('');
  lines.push(`> ${form.description}`);
  lines.push('');
  lines.push(`- Form code: ${form.code}`);
  lines.push(`- Revision: ${form.pdf.revision}`);
  lines.push(`- Issuer: ${form.agency}`);
  lines.push(`- Country: ${form.country}`);
  lines.push(`- Official PDF: ${form.officialUrl}`);
  lines.push(`- Official instructions: ${form.instructionsUrl}`);
  lines.push(`- Template SHA-256: ${form.pdf.sha256}`);
  lines.push(`- Online filler: ${siteUrl}${fillPath(form)}`);
  lines.push(`- SEO landing page: ${formUrl(siteUrl, form)}`);
  lines.push('');
  lines.push('## Who it is for');
  lines.push('');
  lines.push(form.audience);
  lines.push('');
  lines.push('## Steps and fields');
  lines.push('');
  for (const [index, step] of form.steps.entries()) {
    lines.push(`### ${index + 1}. ${step.title}`);
    if (step.subtitle) lines.push('');
    if (step.subtitle) lines.push(step.subtitle);
    lines.push('');
    for (const field of step.fields) {
      const requirement = field.required ? 'required' : 'optional';
      lines.push(`- ${field.label} (${field.type}, ${requirement})`);
    }
    lines.push('');
  }
  lines.push('## Frequently asked questions');
  lines.push('');
  for (const item of form.seo.faq) {
    lines.push(`### ${item.question}`);
    lines.push('');
    lines.push(item.answer);
    lines.push('');
  }
  lines.push('## Disclaimers');
  lines.push('');
  for (const disclaimer of form.disclaimers) lines.push(`- ${disclaimer}`);
  lines.push('');
  lines.push(
    'This document is a machine-readable summary of the online form. The official IRS PDF and instructions control in case of any difference.',
  );
  lines.push('');
  return lines.join('\n');
}

function formUrl(siteUrl: string, form: FormDefinition): string {
  return `${siteUrl}${form.seo.landingPath}`;
}

export function buildAiCatalog(siteUrl: string, now = new Date()): AiFormCatalog {
  return {
    generatedAt: now.toISOString(),
    site: siteUrl,
    forms: FORM_DEFINITIONS.map((form) => ({
      ...toSummary(form),
      markdownUrl: `${siteUrl}/api/ai/forms/${form.slug}/markdown`,
      jsonUrl: `${siteUrl}/api/ai/forms/${form.slug}`,
      templateUrl: `${siteUrl}${form.pdf.path}`,
      fieldsCount: form.steps.reduce((sum, step) => sum + step.fields.length, 0),
    })),
  };
}

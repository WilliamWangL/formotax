import { PDFDocument, PDFRef, StandardFonts, rgb } from 'pdf-lib';
import type { PDFForm } from 'pdf-lib';
import type {
  FieldBinding,
  FormDefinition,
  FormValues,
  PdfTemplateDefinition,
} from '@tax/shared-types';
import { countryName, formatUSDate } from '@tax/validation';

export interface GeneratePdfOptions {
  templateBytes: Uint8Array;
  form: FormDefinition;
  values: FormValues;
  /** PNG/JPEG bytes of the handwritten signature. */
  signatureBytes?: Uint8Array;
  /** Flattening produces a print-ready document. Default: true. */
  flatten?: boolean;
  /** Override the signature date (defaults to today, local time). */
  signatureDate?: Date;
  onWarning?: (message: string) => void;
}

export interface GeneratePdfResult {
  bytes: Uint8Array;
  appliedFields: string[];
  skippedFields: string[];
  warnings: string[];
}

export interface BindingReport {
  missing: string[];
  typeMismatches: Array<{ name: string; expected: string; actual: string }>;
  checked: number;
}

function transformValue(binding: FieldBinding, value: string): string {
  const trimmed = value.trim();
  switch (binding.transform) {
    case 'uppercase':
      return trimmed.toUpperCase();
    case 'digits':
      return trimmed.replace(/\D+/g, '');
    case 'date-mmddyyyy':
      return formatUSDate(trimmed);
    case 'country-name':
      return trimmed ? countryName(trimmed.toUpperCase()) : '';
    default:
      return trimmed;
  }
}

/** WinAnsi-safe fallback so a single unsupported glyph cannot break generation. */
function toWinAnsiSafe(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7E]/g, '');
}

function toDate(value: string | undefined, fallback: Date): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatUSDate(value);
  return formatUSDate(
    `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}-${String(
      fallback.getDate(),
    ).padStart(2, '0')}`,
  );
}

function asString(value: FormValues[string]): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? 'true' : '';
  return String(value);
}

function isTruthy(value: FormValues[string]): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return ['true', 'yes', '1', 'on'].includes(value.toLowerCase());
  return false;
}

/**
 * Writes a value into a text widget. IRS templates often declare MaxLen
 * limits that are tighter than the printed box, so overflowing values are
 * clipped instead of throwing (which would silently drop the whole value).
 */
function writeText(
  pdfForm: PDFForm,
  fieldName: string,
  text: string,
  options: { fontSize?: number; warn?: (message: string) => void } = {},
): void {
  const field = pdfForm.getTextField(fieldName);
  if (options.fontSize) field.setFontSize(options.fontSize);
  const maxLength = field.getMaxLength();
  let value = text;
  if (maxLength !== undefined && value.length > maxLength) {
    value = value.slice(0, maxLength);
    options.warn?.(`Value truncated to the ${maxLength}-character limit of field ${fieldName}.`);
  }
  try {
    field.setText(value);
  } catch {
    field.setText(toWinAnsiSafe(value));
    options.warn?.(`Characters outside WinAnsi were removed for field ${fieldName}.`);
  }
}

/**
 * Fills an IRS AcroForm using the logical-to-widget bindings declared in the
 * form definition. Text fields, checkbox groups, handwritten signatures and
 * signature dates are handled here; nothing leaves the browser unless the
 * caller explicitly uploads the result.
 */
export async function generateTaxFormPdf(
  options: GeneratePdfOptions,
): Promise<GeneratePdfResult> {
  const { templateBytes, form, values, signatureBytes, onWarning } = options;
  const warnings: string[] = [];
  const warn = (message: string) => {
    warnings.push(message);
    onWarning?.(message);
  };

  const pdfDoc = await PDFDocument.load(templateBytes, { updateMetadata: false });
  const pdfForm = pdfDoc.getForm();
  const template: PdfTemplateDefinition = form.pdf;
  const appliedFields: string[] = [];
  const skippedFields: string[] = [];

  const setText = (logical: string, binding: FieldBinding, value: string) => {
    const transformed = transformValue(binding, value);
    if (!transformed) return;
    try {
      if (binding.segments && binding.segments.length > 0) {
        const digits = transformed.replace(/\D+/g, '');
        let offset = 0;
        for (const segment of binding.segments) {
          const part = digits.slice(offset, offset + segment.length);
          offset += segment.length;
          if (!part) continue;
          writeText(pdfForm, segment.field, part, {
            fontSize: binding.fontSize,
            warn,
          });
        }
        appliedFields.push(logical);
        return;
      }

      writeText(pdfForm, binding.field, transformed, { fontSize: binding.fontSize, warn });
      appliedFields.push(logical);
    } catch {
      skippedFields.push(logical);
      warn(`Text field binding missing in template: ${binding.field}`);
    }
  };

  for (const [logical, binding] of Object.entries(template.fields)) {
    const value = values[logical];
    if (binding.type === 'checkbox') {
      try {
        const checkbox = pdfForm.getCheckBox(binding.field);
        if (isTruthy(value)) {
          checkbox.check();
          appliedFields.push(logical);
        } else {
          checkbox.uncheck();
        }
      } catch {
        skippedFields.push(logical);
        warn(`Checkbox binding missing in template: ${binding.field}`);
      }
      continue;
    }

    const text = asString(value);
    if (!text) {
      skippedFields.push(logical);
      continue;
    }
    setText(logical, binding, text);
  }

  for (const [group, optionsMap] of Object.entries(template.optionGroups)) {
    const selected = asString(values[group]);
    for (const [optionValue, widget] of Object.entries(optionsMap)) {
      try {
        const checkbox = pdfForm.getCheckBox(widget);
        if (selected === optionValue) {
          checkbox.check();
          appliedFields.push(`${group}=${optionValue}`);
        } else {
          checkbox.uncheck();
        }
      } catch {
        warn(`Option binding missing in template: ${widget}`);
      }
    }
  }

  const signature = template.signature;
  if (signature && signatureBytes && signatureBytes.length > 0) {
    const page = pdfDoc.getPage(signature.page);
    const isJpeg = signatureBytes[0] === 0xff && signatureBytes[1] === 0xd8;
    const image = isJpeg
      ? await pdfDoc.embedJpg(signatureBytes)
      : await pdfDoc.embedPng(signatureBytes);

    const scale = Math.min(
      signature.width / image.width,
      signature.height / image.height,
    );
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    page.drawImage(image, {
      x: signature.x,
      y: signature.y,
      width: drawWidth,
      height: drawHeight,
    });

    const dateValue = toDate(asString(values.signatureDate) || undefined, options.signatureDate ?? new Date());

    if (signature.dateField) {
      try {
        writeText(pdfForm, signature.dateField, dateValue, { warn });
        appliedFields.push('signatureDate');
      } catch {
        warn(`Signature date field missing: ${signature.dateField}`);
      }
    } else if (signature.dateText) {
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      page.drawText(dateValue, {
        x: signature.dateText.x,
        y: signature.dateText.y,
        size: signature.dateText.size ?? 10,
        font,
        color: rgb(0, 0, 0),
      });
      appliedFields.push('signatureDate');
    }

    if (signature.printedNameField) {
      const printedName = asString(values.printedName);
      if (printedName) {
        try {
          writeText(pdfForm, signature.printedNameField, printedName, { fontSize: 9, warn });
          appliedFields.push('printedName');
        } catch {
          warn(`Printed name field missing: ${signature.printedNameField}`);
        }
      }
    }
  } else if (signature?.required) {
    warn('Signature is required but no signature image was provided.');
  }

  pdfDoc.setTitle(`${form.title} (${template.revision}) - prepared with Global Tax Form Generator`);
  pdfDoc.setSubject(`${form.title}, ${form.agency} ${template.revision}`);
  pdfDoc.setCreator('Global Tax Form Generator');
  pdfDoc.setProducer('Global Tax Form Generator (pdf-lib)');
  pdfDoc.setCreationDate(new Date());
  pdfDoc.setModificationDate(new Date());

  const shouldFlatten = options.flatten ?? template.flatten ?? true;
  if (shouldFlatten) {
    try {
      flattenAcroForm(pdfDoc, pdfForm);
    } catch (error) {
      warn(
        `Flattening failed (${error instanceof Error ? error.message : 'unknown error'}); the PDF was kept editable.`,
      );
      try {
        pdfForm.updateFieldAppearances();
      } catch {
        /* keep the original template if appearances cannot be regenerated */
      }
    }
  } else {
    pdfForm.updateFieldAppearances();
  }

  const bytes = await pdfDoc.save({ useObjectStreams: true });
  return { bytes, appliedFields, skippedFields, warnings };
}

/**
 * pdf-lib's flatten() refuses widgets without a normal appearance and cannot
 * remove /Sig fields. IRS templates declare appearances only for filled
 * widgets, so we drop empty signature fields and force appearances first.
 */
function flattenAcroForm(pdfDoc: PDFDocument, pdfForm: PDFForm): void {
  const acroForm = pdfDoc.catalog.getOrCreateAcroForm();
  const pages = pdfDoc.getPages();

  for (const field of [...pdfForm.getFields()]) {
    if (field.constructor.name !== 'PDFSignature') continue;
    for (const widget of field.acroField.getWidgets()) {
      for (const page of pages) {
        const annots = page.node.Annots();
        if (!annots) continue;
        for (let index = annots.size() - 1; index >= 0; index -= 1) {
          const entry = annots.get(index);
          const resolved =
            entry instanceof PDFRef ? pdfDoc.context.lookup(entry) : entry;
          if (resolved === widget.dict) {
            annots.remove(index);
            break;
          }
        }
      }
    }
    try {
      acroForm.removeField(field.acroField);
    } catch {
      /* field already detached */
    }
  }

  for (const field of [...pdfForm.getFields()]) {
    try {
      pdfForm.markFieldAsDirty(field.ref);
    } catch {
      /* non-updatable field */
    }
  }
  pdfForm.updateFieldAppearances();
  pdfForm.flatten({ updateFieldAppearances: false });
}

/** Decodes a data URL (e.g. from Signature Pad) into raw bytes. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  if (comma === -1) throw new Error('Invalid data URL');
  const meta = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  if (meta.includes(';base64')) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return new TextEncoder().encode(decodeURIComponent(payload));
}

/**
 * Ensures every logical binding exists in the official template and that the
 * field type matches. Used by calibration scripts and CI regression tests.
 */
export async function verifyTemplateBindings(
  templateBytes: Uint8Array,
  template: PdfTemplateDefinition,
): Promise<BindingReport> {
  const pdfDoc = await PDFDocument.load(templateBytes, { updateMetadata: false });
  const pdfForm = pdfDoc.getForm();
  const fieldTypes = new Map<string, string>();
  for (const field of pdfForm.getFields()) {
    fieldTypes.set(field.getName(), field.constructor.name);
  }

  const missing: string[] = [];
  const typeMismatches: BindingReport['typeMismatches'] = [];
  let checked = 0;

  const check = (name: string, expected: string) => {
    checked += 1;
    const actual = fieldTypes.get(name);
    if (!actual) {
      missing.push(name);
      return;
    }
    if (expected && !actual.toLowerCase().includes(expected)) {
      typeMismatches.push({ name, expected, actual });
    }
  };

  for (const binding of Object.values(template.fields)) {
    check(binding.field, binding.type === 'checkbox' ? 'checkbox' : 'text');
  }
  for (const options of Object.values(template.optionGroups)) {
    for (const widget of Object.values(options)) {
      check(widget, 'checkbox');
    }
  }
  if (template.signature?.dateField) check(template.signature.dateField, 'text');
  if (template.signature?.printedNameField) check(template.signature.printedNameField, 'text');

  return { missing, typeMismatches, checked };
}

import { z } from 'zod';
import type {
  FieldCondition,
  FieldDefinition,
  FormDefinition,
  FormValues,
  ValidationResult,
} from '@tax/shared-types';

/* ------------------------------------------------------------------ */
/* Primitive checks                                                    */
/* ------------------------------------------------------------------ */

const ISO_COUNTRIES = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(
  ' ',
);

const COUNTRY_SET = new Set(ISO_COUNTRIES);

const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’&()/,-]*$/u;
const ADDRESS_PATTERN = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9\s.'’#&()/,-]*$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s().-]{6,19}$/;

export function digitsOnly(value: string): string {
  return value.replace(/\D+/g, '');
}

/** Format-only SSN check. A syntactically valid number is not proof of validity. */
export function isValidSSN(value: string): boolean {
  const digits = digitsOnly(value);
  if (digits.length !== 9) return false;
  if (/^(\d)\1{8}$/.test(digits)) return false;
  const area = digits.slice(0, 3);
  const group = digits.slice(3, 5);
  const serial = digits.slice(5);
  if (area === '000' || area === '666' || area.startsWith('9')) return false;
  if (group === '00' || serial === '0000') return false;
  return true;
}

export function isValidITIN(value: string): boolean {
  const digits = digitsOnly(value);
  if (digits.length !== 9) return false;
  if (!digits.startsWith('9')) return false;
  const group = digits.slice(3, 5);
  if (group === '00' || digits.slice(5) === '0000') return false;
  return true;
}

export function isValidEIN(value: string): boolean {
  const digits = digitsOnly(value);
  if (digits.length !== 9) return false;
  if (digits.startsWith('00')) return false;
  return true;
}

export function isValidUSZip(value: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(value.trim());
}

export function isCountryCode(value: string): boolean {
  return COUNTRY_SET.has(value.trim().toUpperCase());
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return PHONE_PATTERN.test(value.trim());
}

export function isLatinText(value: string): boolean {
  return NAME_PATTERN.test(value.trim());
}

export function isLatinAddress(value: string): boolean {
  return ADDRESS_PATTERN.test(value.trim());
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  if (!(year >= 1900 && year <= 2100)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  // Reject non-existent calendar dates such as 2026-02-31.
  return date.toISOString().slice(0, 10) === value;
}

/** Normalizes an ISO date (yyyy-mm-dd) to the MM-DD-YYYY format used by IRS forms. */
export function formatUSDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value.trim();
  return `${match[2]}-${match[3]}-${match[1]}`;
}

/* ------------------------------------------------------------------ */
/* Conditions                                                          */
/* ------------------------------------------------------------------ */

export function evaluateCondition(
  condition: FieldCondition | undefined,
  values: FormValues,
): boolean {
  if (!condition) return true;
  const current = values[condition.field];
  if (condition.truthy !== undefined) {
    const truthy = Boolean(current);
    if (truthy !== condition.truthy) return false;
  }
  if (condition.equals !== undefined && current !== condition.equals) return false;
  if (condition.notEquals !== undefined && current === condition.notEquals) return false;
  if (condition.in && !condition.in.includes(current as string | number | boolean)) return false;
  return true;
}

export function isFieldVisible(field: FieldDefinition, values: FormValues): boolean {
  return evaluateCondition(field.visibleWhen, values);
}

export function isFieldRequired(field: FieldDefinition, values: FormValues): boolean {
  if (field.required) return true;
  if (!field.requiredWhen) return false;
  return evaluateCondition(field.requiredWhen, values);
}

/* ------------------------------------------------------------------ */
/* Field level validation                                              */
/* ------------------------------------------------------------------ */

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  return false;
}

export function validateFieldValue(
  field: FieldDefinition,
  rawValue: unknown,
): string | null {
  if (isEmpty(rawValue)) return null;

  const value = String(rawValue).trim();
  const rule = field.validation?.rule ?? 'none';

  if (field.validation?.maxLength && value.length > field.validation.maxLength) {
    return field.validation.message ?? `${field.label} must be ${field.validation.maxLength} characters or fewer.`;
  }
  if (field.validation?.minLength && value.length < field.validation.minLength) {
    return field.validation.message ?? `${field.label} must be at least ${field.validation.minLength} characters.`;
  }
  if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(value)) {
    return field.validation.message ?? `${field.label} has an invalid format.`;
  }

  switch (rule) {
    case 'ssn':
      return isValidSSN(value)
        ? null
        : 'Enter a valid 9-digit SSN (XXX-XX-XXXX).';
    case 'itin':
      return isValidITIN(value) ? null : 'Enter a valid 9-digit ITIN starting with 9.';
    case 'ein':
      return isValidEIN(value) ? null : 'Enter a valid 9-digit EIN (XX-XXXXXXX).';
    case 'us-zip':
      return isValidUSZip(value) ? null : 'Enter a valid US ZIP code (12345 or 12345-6789).';
    case 'country':
      return isCountryCode(value) ? null : 'Select a valid ISO 3166 country code.';
    case 'email':
      return isValidEmail(value) ? null : 'Enter a valid email address.';
    case 'phone':
      return isValidPhone(value) ? null : 'Enter a valid phone number.';
    case 'latin':
      if (field.type === 'address' || /address|city|street/i.test(field.name)) {
        return isLatinAddress(value)
          ? null
          : 'Use Latin characters and standard address punctuation only.';
      }
      return isLatinText(value)
        ? null
        : 'Use Latin characters (as shown on official documents) only.';
    case 'date':
      return isValidISODate(value) ? null : 'Enter a valid date.';
    case 'digits':
      return /^\d+$/.test(value) ? null : 'Digits only.';
    case 'year':
      return /^(19|20)\d{2}$/.test(value) ? null : 'Enter a 4-digit year.';
    default:
      break;
  }

  if (field.type === 'number' || field.type === 'currency') {
    const numeric = Number(value.replace(/,/g, ''));
    if (Number.isNaN(numeric)) return 'Enter a number.';
    if (field.validation?.min !== undefined && numeric < field.validation.min) {
      return `Enter a value of at least ${field.validation.min}.`;
    }
    if (field.validation?.max !== undefined && numeric > field.validation.max) {
      return `Enter a value no greater than ${field.validation.max}.`;
    }
  }

  if (field.type === 'email' && !isValidEmail(value)) {
    return 'Enter a valid email address.';
  }
  if (field.type === 'date' && !isValidISODate(value)) {
    return 'Enter a valid date.';
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Zod schema generation                                               */
/* ------------------------------------------------------------------ */

export function createFormZodSchema(form: FormDefinition) {
  const shape: Record<string, z.ZodTypeAny> = {};
  const allFields = form.steps.flatMap((step) => step.fields);

  for (const field of allFields) {
    if (field.type === 'signature') {
      shape[field.name] = z.boolean().optional();
    } else if (field.type === 'checkbox') {
      shape[field.name] = z.boolean().optional();
    } else if (field.type === 'number' || field.type === 'currency') {
      shape[field.name] = z
        .union([z.string(), z.number()])
        .optional()
        .transform((value) => (value === '' ? undefined : value));
    } else {
      shape[field.name] = z.string().optional();
    }
  }

  return z.object(shape).superRefine((values, ctx) => {
    for (const field of allFields) {
      if (!isFieldVisible(field, values)) continue;
      const value = values[field.name];

      if (isFieldRequired(field, values) && field.type !== 'signature' && field.type !== 'checkbox') {
        if (isEmpty(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field.name],
            message: `${field.label} is required.`,
          });
        }
      }

      if (field.type === 'checkbox' && isFieldRequired(field, values) && value !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field.name],
          message: `${field.label} must be confirmed.`,
        });
      }

      const fieldError = validateFieldValue(field, value);
      if (fieldError) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field.name],
          message: fieldError,
        });
      }
    }
  });
}

/* ------------------------------------------------------------------ */
/* Whole form validation                                               */
/* ------------------------------------------------------------------ */

export interface FormValidationOptions {
  /** Additional cross-field business rules, returning field -> message. */
  businessRules?: (values: FormValues) => Record<string, string>;
  /** Signature step consent flag and captured signature data URL. */
  signature?: {
    fieldName?: string;
    required?: boolean;
    captured?: boolean;
  };
}

export function validateTaxForm(
  form: FormDefinition,
  values: FormValues,
  options: FormValidationOptions = {},
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const step of form.steps) {
    for (const field of step.fields) {
      if (!isFieldVisible(field, values)) continue;
      if (field.type === 'signature') continue;

      const value = values[field.name];
      if (isFieldRequired(field, values) && field.type !== 'checkbox' && isEmpty(value)) {
        errors[field.name] = `${field.label} is required.`;
        continue;
      }
      if (field.type === 'checkbox' && isFieldRequired(field, values) && value !== true) {
        errors[field.name] = `${field.label} must be confirmed.`;
        continue;
      }
      const message = validateFieldValue(field, value);
      if (message) errors[field.name] = message;
    }
  }

  if (options.businessRules) {
    const extra = options.businessRules(values);
    for (const [field, message] of Object.entries(extra)) {
      if (!errors[field]) errors[field] = message;
    }
  }

  const signature = form.pdf.signature;
  if (signature?.required && options.signature?.required !== false) {
    if (!options.signature?.captured) {
      const key = options.signature?.fieldName ?? 'signature';
      errors[key] = 'A handwritten signature is required on this form.';
    }
  }

  const errorFields = Object.keys(errors);
  let firstInvalidStepId: string | null = null;
  if (errorFields.length > 0) {
    const step = form.steps.find((candidate) =>
      candidate.fields.some((field) => errorFields.includes(field.name)),
    );
    firstInvalidStepId =
      step?.id ??
      (form.pdf.signature?.required && !options.signature?.captured
        ? (form.steps.find((s) => s.kind === 'signature')?.id ?? null)
        : null);
  }

  return {
    valid: errorFields.length === 0,
    errors,
    firstInvalidStepId,
  };
}

/* ------------------------------------------------------------------ */
/* Country options (ISO 3166-1 alpha-2)                                */
/* ------------------------------------------------------------------ */

export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export const COUNTRY_OPTIONS = ISO_COUNTRIES.map((code) => ({
  value: code,
  label: `${countryName(code)} (${code})`,
})).sort((a, b) => a.label.localeCompare(b.label));

/**
 * Shared domain types for the tax form platform.
 *
 * These types are the contract between the web app, the API and the
 * configuration packages. Form definitions are data, never executable code,
 * so they can be persisted as JSON (tax_form_versions.config_json).
 */

export type FormCode = 'W9' | 'W4' | 'W8BEN' | 'W8BENE';

export type FormCategory = 'identification' | 'withholding' | 'certification';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'date'
  | 'email'
  | 'phone'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'ssn'
  | 'ein'
  | 'address'
  | 'signature';

export type ValidationRule =
  | 'none'
  | 'ssn'
  | 'ein'
  | 'itin'
  | 'us-zip'
  | 'us-state'
  | 'country'
  | 'email'
  | 'phone'
  | 'digits'
  | 'latin'
  | 'date'
  | 'year';

export interface FieldCondition {
  field: string;
  equals?: string | number | boolean;
  notEquals?: string | number | boolean;
  in?: Array<string | number | boolean>;
  truthy?: boolean;
}

export interface FieldValidation {
  rule?: ValidationRule;
  pattern?: string;
  message?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

export interface FieldOption {
  value: string;
  label: string;
  hint?: string;
}

export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  requiredWhen?: FieldCondition;
  visibleWhen?: FieldCondition;
  placeholder?: string;
  help?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'decimal';
  maxLength?: number;
  options?: FieldOption[];
  validation?: FieldValidation;
  /** Layout hint: 1 = half width on desktop, 2 = full width */
  colSpan?: 1 | 2;
  defaultValue?: string;
  /** Displays a small "optional" marker instead of "required" */
  optionalLabel?: boolean;
}

export interface FormStep {
  id: string;
  title: string;
  subtitle?: string;
  fields: FieldDefinition[];
  /** Step that hosts the signature pad and consent checkbox */
  kind?: 'fields' | 'signature' | 'review';
}

export interface SeoFaqItem {
  question: string;
  answer: string;
}

export interface SeoSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface FormSeo {
  title: string;
  description: string;
  h1: string;
  keywords: string[];
  landingPath: string;
  intro: string;
  sections: SeoSection[];
  faq: SeoFaqItem[];
}

export interface FieldSegment {
  field: string;
  length: number;
}

export interface FieldBinding {
  /** Fully qualified AcroForm terminal field name (as reported by pdf-lib). */
  field: string;
  type: 'text' | 'checkbox';
  transform?: 'none' | 'uppercase' | 'digits' | 'date-mmddyyyy' | 'country-name';
  fontSize?: number;
  /** Split a digit string (SSN/EIN) across several AcroForm boxes. */
  segments?: FieldSegment[];
  /** Only meaningful for checkboxes: value written to the widget. */
  onValue?: string;
}

export interface SignatureDefinition {
  required: boolean;
  page: number;
  /** PDF user space coordinates, origin bottom-left. */
  x: number;
  y: number;
  width: number;
  height: number;
  signerLabel: string;
  consentText: string;
  /** Date is written into an existing AcroForm text field when provided. */
  dateField?: string;
  /** Otherwise it is drawn at these coordinates. */
  dateText?: { x: number; y: number; size?: number };
  printedNameField?: string;
}

export interface PdfTemplateDefinition {
  path: string;
  pages: number;
  revision: string;
  catalogNumber?: string;
  officialUrl: string;
  sha256: string;
  pageSize: [number, number];
  /** logical field name -> binding */
  fields: Record<string, FieldBinding>;
  /** logical group name -> option value -> checkbox widget field */
  optionGroups: Record<string, Record<string, string>>;
  signature?: SignatureDefinition;
  flatten?: boolean;
}

export interface FormDefinition {
  code: FormCode;
  slug: string;
  version: string;
  country: string;
  language: string;
  title: string;
  shortTitle: string;
  agency: string;
  category: FormCategory;
  audience: string;
  description: string;
  officialUrl: string;
  instructionsUrl: string;
  lastReviewed: string;
  /** Estimated minutes to complete */
  estimatedMinutes: number;
  steps: FormStep[];
  pdf: PdfTemplateDefinition;
  seo: FormSeo;
  disclaimers: string[];
}

export type FormValues = Record<string, string | boolean | number | undefined>;

export interface FieldError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  firstInvalidStepId: string | null;
}

export interface ProgressInfo {
  stepIndex: number;
  totalSteps: number;
  percent: number;
}

/* ------------------------------------------------------------------ */
/* API contracts                                                       */
/* ------------------------------------------------------------------ */

export type UserStatus = 'active' | 'disabled';
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface PublicUser {
  id: string;
  email: string;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: PublicUser;
  tokens: AuthTokens;
}

/**
 * Pay-per-download model: filling and previewing are free, saving a completed
 * document costs a fixed price and unlocks re-downloads for a short window.
 */
export interface DownloadAccessDto {
  active: boolean;
  orderNo: string | null;
  paidAt: string | null;
  /** End of the re-download window; null when there is no active purchase. */
  expiresAt: string | null;
  price: string;
  currency: string;
  accessHours: number;
}

export interface DownloadOrderDto {
  orderNo: string;
  formCode: string;
  amount: string;
  currency: string;
  provider: string;
  status: OrderStatus;
  paidAt: string | null;
  accessExpiresAt: string | null;
  createdAt: string;
}

export interface DownloadCheckoutDto {
  orderNo: string;
  checkoutUrl: string;
  provider: string;
  amount: string;
  currency: string;
}

export interface TaxFormSummaryDto {
  code: FormCode;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  agency: string;
  country: string;
  revision: string;
  audience: string;
  estimatedMinutes: number;
  landingPath: string;
  fillPath: string;
}

export interface TaxFormVersionDto {
  version: string;
  revision: string;
  officialUrl: string;
  effectiveDate: string | null;
  status: 'active' | 'archived';
}

export interface UserTaxFormDto {
  id: string;
  formCode: FormCode;
  version: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Public, AI-readable catalog payload. */
export interface AiFormCatalog {
  generatedAt: string;
  site: string;
  forms: Array<
    TaxFormSummaryDto & {
      markdownUrl: string;
      jsonUrl: string;
      templateUrl: string;
      fieldsCount: number;
    }
  >;
}

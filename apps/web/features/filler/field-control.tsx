'use client';

import type { FieldDefinition } from '@tax/shared-types';
import { Checkbox, FieldError, FieldHelp, FieldLabel, Input, Select, Textarea } from '@/components/ui/field';

const INPUT_MODE: Record<string, 'text' | 'numeric' | 'tel' | 'email' | 'decimal'> = {
  number: 'decimal',
  currency: 'decimal',
  ssn: 'numeric',
  ein: 'numeric',
  date: 'numeric',
  email: 'email',
  phone: 'tel',
};

const PLACEHOLDER: Record<string, string> = {
  ssn: '123-45-6789',
  ein: '12-3456789',
  date: 'YYYY-MM-DD',
  phone: '+1 555 000 1234',
};

export function FieldControl({
  field,
  value,
  error,
  onChange,
  onBlur,
  disabled,
}: {
  field: FieldDefinition;
  value: unknown;
  error?: string;
  onChange: (value: string | boolean) => void;
  onBlur: () => void;
  disabled?: boolean;
}) {
  const id = `field-${field.name}`;
  const describedBy = field.help ? `${id}-help` : undefined;
  const hint = field.optionalLabel || !field.required ? 'Optional' : undefined;

  if (field.type === 'checkbox') {
    return (
      <div className={field.colSpan === 2 ? 'sm:col-span-2' : undefined}>
        <label
          htmlFor={id}
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 hover:border-brand-300"
        >
          <Checkbox
            id={id}
            name={field.name}
            checked={value === true}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            onChange={(event) => onChange(event.target.checked)}
            onBlur={onBlur}
          />
          <span className="text-sm leading-6 text-slate-700">
            {field.label}
            {field.required ? <span className="ml-0.5 text-red-600">*</span> : null}
          </span>
        </label>
        {field.help ? (
          <p id={describedBy} className="mt-1.5 text-xs leading-5 text-slate-500">
            {field.help}
          </p>
        ) : null}
        <FieldError message={error} />
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <fieldset className={field.colSpan === 2 ? 'sm:col-span-2' : undefined}>
        <legend className="mb-1.5 text-sm font-medium text-slate-800">
          {field.label}
          {field.required ? <span className="ml-0.5 text-red-600">*</span> : null}
        </legend>
        <div className="flex flex-wrap gap-3">
          {(field.options ?? []).map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                value === option.value
                  ? 'border-brand-400 bg-brand-50 text-brand-900'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              <input
                type="radio"
                name={field.name}
                value={option.value}
                checked={value === option.value}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                onBlur={onBlur}
                className="h-4 w-4 text-brand-600 focus:ring-brand-300"
              />
              {option.label}
            </label>
          ))}
        </div>
        {field.help ? <FieldHelp>{field.help}</FieldHelp> : null}
        <FieldError message={error} />
      </fieldset>
    );
  }

  if (field.type === 'select') {
    return (
      <div className={field.colSpan === 2 ? 'sm:col-span-2' : undefined}>
        <FieldLabel htmlFor={id} required={field.required} hint={hint}>
          {field.label}
        </FieldLabel>
        <Select
          id={id}
          name={field.name}
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        >
          <option value="">Select an option</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        {field.help ? <FieldHelp>{field.help}</FieldHelp> : null}
        <FieldError message={error} />
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div className={field.colSpan === 2 ? 'sm:col-span-2' : undefined}>
        <FieldLabel htmlFor={id} required={field.required} hint={hint}>
          {field.label}
        </FieldLabel>
        <Textarea
          id={id}
          name={field.name}
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
        {field.help ? <FieldHelp>{field.help}</FieldHelp> : null}
        <FieldError message={error} />
      </div>
    );
  }

  const inputType =
    field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text';

  return (
    <div className={field.colSpan === 2 ? 'sm:col-span-2' : undefined}>
      <FieldLabel htmlFor={id} required={field.required} hint={hint}>
        {field.label}
      </FieldLabel>
      <Input
        id={id}
        name={field.name}
        type={inputType}
        inputMode={field.inputMode ?? INPUT_MODE[field.type]}
        autoComplete={field.autoComplete}
        placeholder={field.placeholder ?? PLACEHOLDER[field.type]}
        maxLength={field.maxLength ?? (field.validation?.maxLength || undefined)}
        value={typeof value === 'string' ? value : value === undefined ? '' : String(value)}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      {field.help ? <FieldHelp>{field.help}</FieldHelp> : null}
      <FieldError message={error} />
    </div>
  );
}

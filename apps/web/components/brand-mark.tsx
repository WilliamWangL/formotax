import { cn } from '@tax/ui';

/** Compact brand mark: a folded IRS page with a check, used in the header. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={cn('h-9 w-9', className)}
    >
      <rect width="64" height="64" rx="14" fill="currentColor" className="text-brand-600" />
      <path
        d="M22.5 12h12L45 22.5V49a3 3 0 0 1-3 3H22.5a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3z"
        fill="#faf9f5"
      />
      <path d="M34.5 12 45 22.5h-7.5a3 3 0 0 1-3-3z" fill="#e8e0cd" />
      <path
        d="M25.5 37 31 42.5 40.5 32.5"
        fill="none"
        stroke="#1c5544"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

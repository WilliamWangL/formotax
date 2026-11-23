function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable ${name}.`);
  return value;
}

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: numberFromEnv('PORT', 4000),
  webUrl: process.env.WEB_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  database: {
    url: required('DATABASE_URL', 'mysql://tax:tax_password@localhost:3306/tax_form'),
  },
  redis: {
    url: process.env.REDIS_URL ?? '',
  },
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'change-me-access-secret'),
    accessTtl: numberFromEnv('JWT_ACCESS_TTL', 900),
    refreshSecret: required('JWT_REFRESH_SECRET', 'change-me-refresh-secret'),
    refreshTtl: numberFromEnv('JWT_REFRESH_TTL', 2_592_000),
  },
  storage: {
    /** Directory that holds the official templates bundled with the app. */
    templateDir: process.env.TEMPLATE_DIR ?? '../web/public/templates',
    /**
     * Writable directory on the server disk. Updated templates dropped in
     * `${storageDir}/templates` take precedence over the bundled copies, so
     * operators can publish a new IRS revision without rebuilding the image.
     */
    storageDir: process.env.STORAGE_DIR ?? './storage',
  },
  payments: {
    /** PayPal is the only supported payment method. */
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID ?? '',
      clientSecret: process.env.PAYPAL_CLIENT_SECRET ?? '',
      webhookId: process.env.PAYPAL_WEBHOOK_ID ?? '',
      /** sandbox | live */
      mode: (process.env.PAYPAL_MODE ?? 'sandbox').toLowerCase(),
      brandName: process.env.PAYPAL_BRAND_NAME ?? 'FormoTax',
      /** PayPal requires an https return URL in live mode. */
      baseUrl:
        (process.env.PAYPAL_API_URL ?? '').replace(/\/$/, '') ||
        ((process.env.PAYPAL_MODE ?? 'sandbox').toLowerCase() === 'live'
          ? 'https://api-m.paypal.com'
          : 'https://api-m.sandbox.paypal.com'),
    },
  },
  download: {
    /** Filling and previewing are free; only saving the PDF is charged. */
    priceUsd: numberFromEnv('DOWNLOAD_PRICE_USD', 1),
    /** How long a paid document can be downloaded again without paying. */
    accessHours: numberFromEnv('DOWNLOAD_ACCESS_HOURS', 24),
  },
} as const;

'use client';

import type {
  AuthResponse,
  AuthTokens,
  DownloadAccessDto,
  DownloadCheckoutDto,
  DownloadOrderDto,
  Paginated,
  PublicUser,
  UserTaxFormDto,
} from '@tax/shared-types';
import { siteConfig } from '@/lib/site';

const TOKEN_KEY = 'taxform:tokens';

/** Refresh this long before the access token expires so a request never races it. */
const REFRESH_MARGIN_MS = 60_000;

/** Endpoints that must not trigger a refresh: they either create or rotate sessions. */
const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms when the access token stops working. Missing on older sessions. */
  expiresAt?: number;
}

export function readTokens(): StoredTokens | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    return null;
  }
}

export function writeTokens(tokens: StoredTokens | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (tokens) window.localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage disabled */
  }
}

function storeTokens(tokens: AuthTokens): StoredTokens {
  const stored: StoredTokens = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
  };
  writeTokens(stored);
  return stored;
}

/**
 * The access token only lives 15 minutes while a filled form stays open for
 * hours. Refresh tokens rotate on every use, so concurrent callers share one
 * request instead of racing each other into a revoked token.
 */
let refreshInFlight: Promise<StoredTokens | null> | null = null;

function refreshSession(): Promise<StoredTokens | null> {
  if (refreshInFlight) return refreshInFlight;
  const current = readTokens();
  if (!current?.refreshToken) return Promise.resolve(null);

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${siteConfig.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      if (!response.ok) return null;
      const result = (await response.json()) as AuthResponse;
      return storeTokens(result.tokens);
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function send(
  path: string,
  init: RequestInit,
  accessToken: string | undefined,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  try {
    return await fetch(`${siteConfig.apiUrl}${path}`, { ...init, headers });
  } catch {
    throw new ApiRequestError(
      'The account service is unreachable. You can still fill and preview forms, but downloading needs a connection.',
      0,
    );
  }
}

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const mayRefresh = !NO_REFRESH_PATHS.some((prefix) => path.startsWith(prefix));
  let tokens = readTokens();

  if (mayRefresh && tokens?.expiresAt && tokens.expiresAt - Date.now() < REFRESH_MARGIN_MS) {
    tokens = (await refreshSession()) ?? tokens;
  }

  let response = await send(path, init, tokens?.accessToken);

  if (mayRefresh && response.status === 401) {
    const renewed = await refreshSession();
    if (renewed) response = await send(path, init, renewed.accessToken);
  }

  if (!response.ok) {
    // Nothing left to refresh: drop the dead pair so the next click sends the
    // visitor to sign in instead of repeating a 401 forever.
    if (mayRefresh && response.status === 401) writeTokens(null);

    let message = `Request failed with status ${response.status}.`;
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(payload.message)) message = payload.message.join(' ');
      else if (payload.message) message = payload.message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiRequestError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function registerAccount(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  storeTokens(result.tokens);
  return result;
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  storeTokens(result.tokens);
  return result;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest<void>('/auth/logout', { method: 'POST' });
  } catch {
    /* the local token is cleared regardless */
  }
  writeTokens(null);
}

export async function fetchMe(): Promise<PublicUser> {
  return apiRequest<PublicUser>('/users/me');
}

export async function fetchDownloadAccess(formCode: string): Promise<DownloadAccessDto> {
  return apiRequest<DownloadAccessDto>(`/downloads/access?formCode=${encodeURIComponent(formCode)}`);
}

/** Creates a pending order and returns the provider checkout URL. */
export async function startDownloadCheckout(formCode: string): Promise<DownloadCheckoutDto> {
  return apiRequest<DownloadCheckoutDto>('/downloads/checkout', {
    method: 'POST',
    body: JSON.stringify({ formCode }),
  });
}

export async function fetchDownloadOrder(orderNo: string): Promise<DownloadOrderDto> {
  return apiRequest<DownloadOrderDto>(`/downloads/orders/${encodeURIComponent(orderNo)}`);
}

/** Captures a provider-approved checkout after the buyer is redirected back. */
export async function captureDownloadOrder(orderNo: string): Promise<DownloadOrderDto> {
  return apiRequest<DownloadOrderDto>(`/downloads/orders/${encodeURIComponent(orderNo)}/capture`, {
    method: 'POST',
  });
}

export async function fetchDownloadOrders(): Promise<Paginated<DownloadOrderDto>> {
  return apiRequest<Paginated<DownloadOrderDto>>('/downloads/orders?page=1&pageSize=20');
}

export async function fetchUserTaxForms(): Promise<Paginated<UserTaxFormDto>> {
  return apiRequest<Paginated<UserTaxFormDto>>('/user-tax-forms?page=1&pageSize=20');
}

'use client';

import type {
  AuthResponse,
  DownloadAccessDto,
  DownloadCheckoutDto,
  DownloadOrderDto,
  Paginated,
  PublicUser,
  UserTaxFormDto,
} from '@tax/shared-types';
import { siteConfig } from '@/lib/site';

const TOKEN_KEY = 'taxform:tokens';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
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

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokens = readTokens();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (tokens?.accessToken) headers.set('Authorization', `Bearer ${tokens.accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${siteConfig.apiUrl}${path}`, { ...init, headers });
  } catch {
    throw new ApiRequestError(
      'The account service is unreachable. You can still fill and preview forms, but downloading needs a connection.',
      0,
    );
  }

  if (!response.ok) {
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
  writeTokens(result.tokens);
  return result;
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  writeTokens(result.tokens);
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

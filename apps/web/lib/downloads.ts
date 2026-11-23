/**
 * Local mirror of paid download passes.
 *
 * The API is the source of truth (`GET /downloads/access`); this cache only
 * lets the wizard show an unlocked state before the request returns, or while
 * the account service is briefly unreachable.
 */

const STORAGE_KEY = 'taxform:download-passes';

export interface DownloadPass {
  formCode: string;
  orderNo: string;
  expiresAt: string;
}

function isUsable(pass: DownloadPass, now: Date): boolean {
  const expiresAt = new Date(pass.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

export function readPasses(now = new Date()): DownloadPass[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DownloadPass[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (pass) =>
        typeof pass?.formCode === 'string' &&
        typeof pass?.orderNo === 'string' &&
        isUsable(pass, now),
    );
  } catch {
    return [];
  }
}

export function readPass(formCode: string, now = new Date()): DownloadPass | null {
  return readPasses(now).find((pass) => pass.formCode === formCode) ?? null;
}

export function savePass(pass: DownloadPass, now = new Date()): void {
  if (typeof window === 'undefined') return;
  try {
    const others = readPasses(now).filter((item) => item.formCode !== pass.formCode);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...others, pass]));
  } catch {
    /* storage disabled: the server-side access check still applies */
  }
}

export function clearPasses(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage disabled */
  }
}

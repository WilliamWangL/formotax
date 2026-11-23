import type { FormValues } from '@tax/shared-types';

/**
 * Drafts live in the browser only. Signatures are deliberately excluded so a
 * shared device never keeps a copy of someone's handwriting.
 */

const PREFIX = 'taxform:draft:';

export interface StoredDraft {
  values: FormValues;
  savedAt: string;
}

export function loadDraft(code: string): StoredDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${code}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed || typeof parsed !== 'object' || !parsed.values) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(code: string, values: FormValues): void {
  if (typeof window === 'undefined') return;
  try {
    const draft: StoredDraft = { values, savedAt: new Date().toISOString() };
    window.localStorage.setItem(`${PREFIX}${code}`, JSON.stringify(draft));
  } catch {
    /* quota exceeded or storage disabled: drafts are best effort */
  }
}

export function clearDraft(code: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${PREFIX}${code}`);
  } catch {
    /* ignore */
  }
}

export interface DraftSummary extends StoredDraft {
  code: string;
}

/** Lists every draft kept in this browser, newest first. */
export function listDrafts(): DraftSummary[] {
  if (typeof window === 'undefined') return [];
  const drafts: DraftSummary[] = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(PREFIX)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as StoredDraft;
        if (!parsed?.values) continue;
        drafts.push({ code: key.slice(PREFIX.length), ...parsed });
      } catch {
        /* skip malformed entries */
      }
    }
  } catch {
    return drafts;
  }
  return drafts.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}


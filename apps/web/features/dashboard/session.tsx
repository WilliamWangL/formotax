'use client';

import { createContext, useContext } from 'react';
import type { PublicUser } from '@tax/shared-types';

export interface SessionState {
  user: PublicUser | null;
  ready: boolean;
  /** False when the API cannot be reached, so panels fall back to local data. */
  apiReachable: boolean;
}

const SessionContext = createContext<SessionState>({ user: null, ready: false, apiReachable: true });

export const SessionProvider = SessionContext.Provider;

export function useSession(): SessionState {
  return useContext(SessionContext);
}

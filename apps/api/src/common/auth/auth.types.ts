import type { Request } from 'express';

export type UserRole = 'user' | 'admin';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
  jti: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  jti?: string;
}

export interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
  rawBody?: Buffer;
}

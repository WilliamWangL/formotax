import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

const RATE_LIMIT_KEY = 'rateLimit';

/** Simple per-IP limiter for login and registration endpoints. */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const key = `${request.ip ?? 'unknown'}:${request.method}:${request.path}`;
    const now = Date.now();
    const windowStart = now - options.windowMs;
    const history = (this.hits.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

    if (history.length >= options.limit) {
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: 'Too many attempts. Please wait a minute and try again.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    history.push(now);
    this.hits.set(key, history);
    if (this.hits.size > 5_000) {
      for (const [entry, timestamps] of this.hits) {
        if (timestamps.every((timestamp) => timestamp <= windowStart)) this.hits.delete(entry);
      }
    }
    return true;
  }
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { env } from '../env';
import { RedisService } from '../redis/redis.module';
import { ADMIN_ONLY_KEY, IS_PUBLIC_KEY } from './auth.decorators';
import type { RequestWithUser, TokenPayload } from './auth.types';

function unauthorized(code: string, message: string): UnauthorizedException {
  return new UnauthorizedException({ code, message });
}

/**
 * Global guard: every route requires a valid access token unless it is marked
 * with @Public(). Admin routes additionally require a token with the admin role.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const adminOnly = this.reflector.getAllAndOverride<boolean>(ADMIN_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw unauthorized('UNAUTHORIZED', 'A bearer access token is required.');
    }

    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(header.slice(7), {
        secret: env.jwt.accessSecret,
      });
    } catch {
      throw unauthorized('INVALID_TOKEN', 'The access token is invalid or has expired.');
    }

    if (payload.type !== 'access') {
      throw unauthorized('INVALID_TOKEN', 'A refresh token cannot be used as an access token.');
    }

    if (payload.jti && (await this.redis.get(`auth:revoked:${payload.jti}`))) {
      throw unauthorized('TOKEN_REVOKED', 'This session has been signed out.');
    }

    if (payload.role !== 'admin' && (await this.redis.get(`user:disabled:${payload.sub}`))) {
      throw unauthorized('ACCOUNT_DISABLED', 'This account is no longer available.');
    }

    if (adminOnly && payload.role !== 'admin') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Administrator access required.' });
    }

    if (!adminOnly && payload.role === 'admin') {
      throw new ForbiddenException({
        code: 'ADMIN_TOKEN_NOT_ALLOWED',
        message: 'Administrator tokens can only be used on /admin endpoints.',
      });
    }

    request.user = {
      id: String(payload.sub),
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
    };
    return true;
  }
}

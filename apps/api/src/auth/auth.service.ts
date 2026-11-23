import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { AuthResponse, AuthTokens, PublicUser } from '@tax/shared-types';
import { env } from '../common/env';
import { PrismaService } from '../common/prisma/prisma.module';
import { RedisService } from '../common/redis/redis.module';
import type { TokenPayload } from '../common/auth/auth.types';
import type { LoginDto, LogoutDto, RefreshDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && !existing.deletedAt) {
      throw new ConflictException({
        code: 'EMAIL_IN_USE',
        message: 'An account with this email already exists. Try signing in instead.',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            name: dto.name?.trim() || null,
            status: 1,
            deletedAt: null,
            lastLoginAt: new Date(),
          },
        })
      : await this.prisma.user.create({
          data: {
            email,
            passwordHash,
            name: dto.name?.trim() || null,
            status: 1,
            lastLoginAt: new Date(),
          },
        });

    return { user: this.toPublicUser(user), tokens: await this.issueTokens(user) };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    const valid = user && !user.deletedAt ? await bcrypt.compare(dto.password, user.passwordHash) : false;

    if (!user || !valid || user.deletedAt) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'The email or password is incorrect.',
      });
    }
    if (user.status !== 1) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_DISABLED',
        message: 'This account has been disabled. Contact support for help.',
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return { user: this.toPublicUser(updated), tokens: await this.issueTokens(updated) };
  }

  async refresh(dto: RefreshDto): Promise<AuthResponse> {
    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(dto.refreshToken, {
        secret: env.jwt.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'The refresh token is invalid or has expired. Please sign in again.',
      });
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'The refresh token is invalid. Please sign in again.',
      });
    }
    if (await this.redis.get(`auth:revoked:${payload.jti}`)) {
      throw new UnauthorizedException({
        code: 'TOKEN_REVOKED',
        message: 'This session has been signed out. Please sign in again.',
      });
    }

    const user = await this.prisma.user.findFirst({
      where: { id: BigInt(payload.sub), deletedAt: null },
    });
    if (!user || user.status !== 1) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_UNAVAILABLE',
        message: 'This account is no longer available.',
      });
    }

    // Rotate: the presented refresh token cannot be used twice.
    await this.revoke(payload);
    return { user: this.toPublicUser(user), tokens: await this.issueTokens(user) };
  }

  async logout(userJti: string | undefined, dto: LogoutDto): Promise<void> {
    if (userJti) {
      await this.redis.set(`auth:revoked:${userJti}`, '1', env.jwt.accessTtl);
    }
    if (dto.refreshToken) {
      try {
        const payload = await this.jwt.verifyAsync<TokenPayload>(dto.refreshToken, {
          secret: env.jwt.refreshSecret,
        });
        await this.revoke(payload);
      } catch {
        /* an invalid refresh token needs no revocation */
      }
    }
  }

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id.toString(),
      email: user.email,
      status: user.status === 1 ? 'active' : 'disabled',
      emailVerified: Boolean(user.emailVerifiedAt),
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const base = {
      sub: user.id.toString(),
      email: user.email,
      role: 'user' as const,
      jti: randomUUID(),
    };
    const accessToken = await this.jwt.signAsync(
      { ...base, type: 'access' },
      { secret: env.jwt.accessSecret, expiresIn: env.jwt.accessTtl },
    );
    const refreshToken = await this.jwt.signAsync(
      { ...base, jti: randomUUID(), type: 'refresh' },
      { secret: env.jwt.refreshSecret, expiresIn: env.jwt.refreshTtl },
    );
    return { accessToken, refreshToken, expiresIn: env.jwt.accessTtl };
  }

  private async revoke(payload: TokenPayload): Promise<void> {
    const ttl = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : env.jwt.refreshTtl;
    if (payload.jti && ttl > 0) {
      await this.redis.set(`auth:revoked:${payload.jti}`, '1', ttl);
    }
  }
}

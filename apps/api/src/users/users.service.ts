import { Injectable, NotFoundException } from '@nestjs/common';
import type { PublicUser } from '@tax/shared-types';
import { env } from '../common/env';
import { PrismaService } from '../common/prisma/prisma.module';
import { RedisService } from '../common/redis/redis.module';

export interface UserProfile extends PublicUser {
  name: string | null;
}

export interface UpdateProfileInput {
  name?: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findFirst({
      where: { id: BigInt(userId), deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Account not found.' });
    }
    return {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      status: user.status === 1 ? 'active' : 'disabled',
      emailVerified: Boolean(user.emailVerifiedAt),
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    const data: { name?: string | null } = {};
    if (input.name !== undefined) data.name = input.name.trim() || null;
    await this.prisma.user.update({ where: { id: BigInt(userId) }, data });
    return this.findProfile(userId);
  }

  /**
   * Soft deletes the account, strips the profile name and blocks outstanding
   * tokens. Download orders are kept for accounting without personal data.
   */
  async deleteAccount(userId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: BigInt(userId), deletedAt: null },
    });
    if (!user) return;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { status: 0, deletedAt: new Date(), name: null },
    });

    await this.redis.set(`user:disabled:${userId}`, '1', env.jwt.refreshTtl);
  }
}

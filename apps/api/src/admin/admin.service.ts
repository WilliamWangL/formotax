import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { RedisService } from '../common/redis/redis.module';
import { PrismaService } from '../common/prisma/prisma.module';
import { env } from '../common/env';
import { TaxFormsService } from '../tax-forms/tax-forms.service';

export interface AdminSession {
  admin: { id: string; email: string; role: string };
  accessToken: string;
  expiresIn: number;
}

const ADMIN_TTL_SECONDS = 8 * 60 * 60;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly taxForms: TaxFormsService,
  ) {}

  async login(email: string, password: string): Promise<AdminSession> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    const valid = admin ? await bcrypt.compare(password, admin.passwordHash) : false;
    if (!admin || !valid || admin.status !== 1) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'The email or password is incorrect.',
      });
    }

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = await this.jwt.signAsync(
      {
        sub: admin.id.toString(),
        email: admin.email,
        role: 'admin',
        type: 'access',
        jti: randomUUID(),
      },
      { secret: env.jwt.accessSecret, expiresIn: ADMIN_TTL_SECONDS },
    );

    return {
      admin: { id: admin.id.toString(), email: admin.email, role: admin.role },
      accessToken,
      expiresIn: ADMIN_TTL_SECONDS,
    };
  }

  async stats() {
    const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

    const [users, activeUsers, newUsers, paidOrders, revenue, downloads] =
      await this.prisma.$transaction([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.user.count({ where: { deletedAt: null, status: 1 } }),
        this.prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
        this.prisma.paymentOrder.count({ where: { status: 'paid' } }),
        this.prisma.paymentOrder.aggregate({
          where: { status: 'paid' },
          _sum: { amount: true },
        }),
        this.prisma.usageLog.aggregate({
          where: { action: 'download', createdAt: { gte: monthStart } },
          _sum: { quantity: true },
        }),
      ]);

    const recentOrders = await this.prisma.paymentOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { email: true } } },
    });

    return {
      users: { total: users, active: activeUsers, newThisMonth: newUsers },
      orders: {
        paid: paidOrders,
        revenue: revenue._sum.amount ? revenue._sum.amount.toFixed(2) : '0.00',
        currency: 'USD',
      },
      usage: { downloadsThisMonth: downloads._sum.quantity ?? 0 },
      recentOrders: recentOrders.map((order) => ({
        orderNo: order.orderNo,
        email: order.user.email,
        formCode: order.formCode,
        amount: order.amount.toFixed(2),
        status: order.status,
        createdAt: order.createdAt.toISOString(),
      })),
    };
  }

  async users(page: number, pageSize: number, search?: string) {
    const where = {
      deletedAt: null,
      ...(search ? { email: { contains: search } } : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { orders: { where: { status: 'paid' } } } },
        },
      }),
    ]);

    return {
      items: rows.map((user) => ({
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        status: user.status === 1 ? 'active' : 'disabled',
        paidDownloads: user._count.orders,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      })),
      page,
      pageSize,
      total,
    };
  }

  async setUserStatus(id: string, status: number): Promise<{ id: string; status: string }> {
    const user = await this.prisma.user.findFirst({ where: { id: BigInt(id), deletedAt: null } });
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Account not found.' });
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { status } });
    if (status === 1) await this.redis.del(`user:disabled:${id}`);
    else await this.redis.set(`user:disabled:${id}`, '1', env.jwt.refreshTtl);

    return { id, status: status === 1 ? 'active' : 'disabled' };
  }

  async orders(page: number, pageSize: number, status?: string) {
    const where = status ? { status } : {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.paymentOrder.count({ where }),
      this.prisma.paymentOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { email: true } } },
      }),
    ]);

    return {
      items: rows.map((order) => ({
        orderNo: order.orderNo,
        email: order.user.email,
        formCode: order.formCode,
        amount: order.amount.toFixed(2),
        currency: order.currency,
        provider: order.provider,
        status: order.status,
        paidAt: order.paidAt ? order.paidAt.toISOString() : null,
        accessExpiresAt: order.accessExpiresAt ? order.accessExpiresAt.toISOString() : null,
        createdAt: order.createdAt.toISOString(),
      })),
      page,
      pageSize,
      total,
    };
  }

  async usageByForm() {
    const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
    const groups = await this.prisma.usageLog.groupBy({
      by: ['formCode'],
      where: { createdAt: { gte: monthStart } },
      _sum: { quantity: true },
      _count: { _all: true },
    });

    return groups.map((group) => ({
      formCode: group.formCode ?? 'unknown',
      downloads: group._sum.quantity ?? 0,
      events: group._count._all,
    }));
  }

  async setVersionStatus(formCode: string, version: string, status: 1 | 0) {
    const record = await this.prisma.taxFormVersion.findFirst({
      where: { version, form: { formCode: formCode.toUpperCase() } },
    });
    if (!record) {
      throw new NotFoundException({ code: 'VERSION_NOT_FOUND', message: 'Revision not found.' });
    }

    await this.prisma.taxFormVersion.update({ where: { id: record.id }, data: { status } });
    if (status === 1) {
      await this.prisma.taxFormVersion.updateMany({
        where: { formId: record.formId, id: { not: record.id } },
        data: { status: 0 },
      });
    }
    await this.taxForms.invalidate(formCode);
    return { formCode: formCode.toUpperCase(), version, status: status === 1 ? 'active' : 'archived' };
  }
}

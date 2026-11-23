import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/auth/auth.decorators';
import { PrismaService } from '../common/prisma/prisma.module';
import { RedisService } from '../common/redis/redis.module';
import { TemplateStorageService } from '../common/storage/template-storage.service';
import { env } from '../common/env';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: TemplateStorageService,
  ) {}

  @Public()
  @Get()
  async check(): Promise<{
    status: 'ok' | 'degraded';
    uptime: number;
    version: string;
    database: 'up' | 'down';
    redis: 'up' | 'disabled' | 'down';
    templates: 'ok' | 'missing';
    paymentProvider: 'paypal';
    paypal: 'configured' | 'not_configured';
    environment: string;
    timestamp: string;
  }> {
    const database = (await this.prisma.ping()) ? 'up' : 'down';
    const redis = env.redis.url ? (this.redis.isAvailable() ? 'up' : 'down') : 'disabled';
    const templates = this.storage.exists('US/W9/fw9.pdf') ? 'ok' : 'missing';
    const paypalConfigured = Boolean(
      env.payments.paypal.clientId && env.payments.paypal.clientSecret,
    );

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      uptime: Math.round(process.uptime()),
      version: process.env.npm_package_version ?? '1.1.0',
      database,
      redis,
      templates,
      paymentProvider: 'paypal',
      paypal: paypalConfigured ? 'configured' : 'not_configured',
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
    };
  }
}

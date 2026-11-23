import { Global, Injectable, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '../env';

/**
 * Thin, best-effort Redis wrapper. Caching is an optimisation: when Redis is not
 * configured or not reachable every method degrades to a miss so the API keeps
 * serving from MySQL.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private available = false;

  onModuleInit(): void {
    if (!env.redis.url) {
      this.logger.warn('REDIS_URL is not set; caching and token revocation are disabled.');
      return;
    }
    this.client = new Redis(env.redis.url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    this.client.on('error', (error) => {
      if (this.available) this.logger.warn(`Redis error: ${error.message}`);
      this.available = false;
    });
    this.client
      .connect()
      .then(() => {
        this.available = true;
        this.logger.log('Redis connected.');
      })
      .catch((error: Error) => {
        this.logger.warn(`Redis unavailable (${error.message}); continuing without cache.`);
      });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit().catch(() => undefined);
  }

  isAvailable(): boolean {
    return this.available;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client || !this.available) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client || !this.available) return;
    try {
      if (ttlSeconds) await this.client.set(key, value, 'EX', ttlSeconds);
      else await this.client.set(key, value);
    } catch {
      /* cache writes are best effort */
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.client || !this.available || keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch {
      /* ignore */
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    if (!this.client || !this.available) return;
    try {
      const keys = await this.client.keys(`${prefix}*`);
      if (keys.length > 0) await this.client.del(...keys);
    } catch {
      /* ignore */
    }
  }
}

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}

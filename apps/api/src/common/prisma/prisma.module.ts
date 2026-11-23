import { Global, Injectable, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma client wrapper. The API still boots when MySQL is unreachable so that
 * /health can report the failure instead of crash-looping; requests that need
 * the database surface a 503.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private available = false;

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.available = true;
    } catch (error) {
      this.logger.error(`Database connection failed: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect().catch(() => undefined);
  }

  isAvailable(): boolean {
    return this.available;
  }

  async ping(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      this.available = true;
      return true;
    } catch {
      this.available = false;
      return false;
    }
  }
}

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

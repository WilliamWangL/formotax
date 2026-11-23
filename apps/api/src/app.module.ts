import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { StorageModule } from './common/storage/storage.module';
import { HealthController } from './health/health.controller';
import { PaymentsModule } from './payments/payments.module';
import { TaxFormsModule } from './tax-forms/tax-forms.module';
import { UserTaxFormsModule } from './user-tax-forms/user-tax-forms.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    JwtModule.register({ global: true }),
    PrismaModule,
    RedisModule,
    StorageModule,
    AuthModule,
    UsersModule,
    TaxFormsModule,
    UserTaxFormsModule,
    PaymentsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}

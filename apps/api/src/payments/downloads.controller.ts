import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import type {
  DownloadAccessDto,
  DownloadCheckoutDto,
  DownloadOrderDto,
} from '@tax/shared-types';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/auth.types';
import { PaymentsService } from './payments.service';

export class DownloadAccessQueryDto {
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9-]+$/)
  formCode!: string;
}

export class DownloadCheckoutDtoBody {
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9-]+$/)
  formCode!: string;
}

export class DownloadOrderListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}

/**
 * Pay-per-download endpoints. Every route requires a signed-in user: filling
 * stays anonymous, but a purchase has to be tied to an account so the
 * re-download window can be recognised on any device.
 */
@Controller('downloads')
export class DownloadsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('access')
  access(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DownloadAccessQueryDto,
  ): Promise<DownloadAccessDto> {
    return this.payments.access(user.id, query.formCode);
  }

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: DownloadCheckoutDtoBody,
  ): Promise<DownloadCheckoutDto> {
    return this.payments.createDownloadOrder(user.id, body.formCode);
  }

  @Get('orders')
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: DownloadOrderListQueryDto) {
    return this.payments.listOrders(user.id, query.page ?? 1, query.pageSize ?? 20);
  }

  @Get('orders/:orderNo')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderNo') orderNo: string,
  ): Promise<DownloadOrderDto> {
    return this.payments.findOrder(user.id, orderNo);
  }

  /** Captures the checkout when the provider redirects the buyer back. */
  @Post('orders/:orderNo/capture')
  @HttpCode(HttpStatus.OK)
  capture(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderNo') orderNo: string,
  ): Promise<DownloadOrderDto> {
    return this.payments.captureOrder(user.id, orderNo);
  }
}

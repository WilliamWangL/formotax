import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AdminOnly, Public } from '../common/auth/auth.decorators';
import { RateLimit, RateLimitGuard } from '../common/rate-limit.guard';
import { AdminService, type AdminSession } from './admin.service';

export class AdminLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MaxLength(72)
  password!: string;
}

export class AdminListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;
}

export class UpdateUserStatusDto {
  @IsInt()
  @IsIn([0, 1])
  status!: number;
}

@AdminOnly()
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Public()
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 8, windowMs: 60_000 })
  login(@Body() dto: AdminLoginDto): Promise<AdminSession> {
    return this.admin.login(dto.email, dto.password);
  }

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('users')
  users(@Query() query: AdminListQueryDto) {
    return this.admin.users(query.page ?? 1, query.pageSize ?? 20, query.search);
  }

  @Patch('users/:id')
  setUserStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.admin.setUserStatus(id, dto.status);
  }

  @Get('orders')
  orders(@Query() query: AdminListQueryDto) {
    return this.admin.orders(query.page ?? 1, query.pageSize ?? 20, query.status);
  }

  @Get('usage')
  usage() {
    return this.admin.usageByForm();
  }

  @Patch('tax-forms/:code/versions/:version')
  setVersionStatus(
    @Param('code') code: string,
    @Param('version') version: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.admin.setVersionStatus(code, version, dto.status === 1 ? 1 : 0);
  }
}

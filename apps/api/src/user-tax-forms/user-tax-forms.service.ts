import { Injectable, NotFoundException } from '@nestjs/common';
import type { Paginated, UserTaxFormDto } from '@tax/shared-types';
import { getForm } from '@tax/tax-form-engine';
import { PrismaService } from '../common/prisma/prisma.module';

export interface CreateUserTaxFormInput {
  formCode: string;
  title?: string;
  version?: string;
}

@Injectable()
export class UserTaxFormsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateUserTaxFormInput): Promise<UserTaxFormDto> {
    const form = getForm(input.formCode);
    if (!form) {
      throw new NotFoundException({
        code: 'FORM_NOT_FOUND',
        message: `No tax form is available for "${input.formCode}".`,
      });
    }

    const record = await this.prisma.taxForm.findFirst({
      where: { formCode: form.code, status: 1 },
      include: {
        versions: {
          where: input.version ? { version: input.version } : { status: 1 },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const version = record?.versions[0];
    if (!record || !version) {
      throw new NotFoundException({
        code: 'FORM_VERSION_NOT_FOUND',
        message: 'The selected revision is not available. Run the seed script first.',
      });
    }

    const created = await this.prisma.userTaxForm.create({
      data: {
        userId: BigInt(userId),
        formId: record.id,
        versionId: version.id,
        title: input.title?.trim() || `${form.shortTitle} record`,
        status: 1,
      },
    });

    return this.toDto(created.id, form.code, version.version, created.title, created.status, created.createdAt, created.updatedAt);
  }

  async list(userId: string, page: number, pageSize: number): Promise<Paginated<UserTaxFormDto>> {
    const where = { userId: BigInt(userId), status: { not: 0 } };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.userTaxForm.count({ where }),
      this.prisma.userTaxForm.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { form: true, version: true },
      }),
    ]);

    return {
      items: rows.map((row) =>
        this.toDto(
          row.id,
          row.form.formCode,
          row.version.version,
          row.title,
          row.status,
          row.createdAt,
          row.updatedAt,
        ),
      ),
      page,
      pageSize,
      total,
    };
  }

  async findOne(userId: string, id: string): Promise<UserTaxFormDto> {
    const row = await this.prisma.userTaxForm.findFirst({
      where: { id: BigInt(id), userId: BigInt(userId), status: { not: 0 } },
      include: { form: true, version: true },
    });
    if (!row) {
      throw new NotFoundException({ code: 'RECORD_NOT_FOUND', message: 'Record not found.' });
    }
    return this.toDto(
      row.id,
      row.form.formCode,
      row.version.version,
      row.title,
      row.status,
      row.createdAt,
      row.updatedAt,
    );
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.prisma.userTaxForm.updateMany({
      where: { id: BigInt(id), userId: BigInt(userId), status: { not: 0 } },
      data: { status: 0 },
    });
    if (result.count === 0) {
      throw new NotFoundException({ code: 'RECORD_NOT_FOUND', message: 'Record not found.' });
    }
  }

  private toDto(
    id: bigint,
    formCode: string,
    version: string,
    title: string,
    status: number,
    createdAt: Date,
    updatedAt: Date,
  ): UserTaxFormDto {
    const statuses: Record<number, string> = { 0: 'deleted', 1: 'draft', 2: 'completed' };
    return {
      id: id.toString(),
      formCode: formCode as UserTaxFormDto['formCode'],
      version,
      title,
      status: statuses[status] ?? 'draft',
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    };
  }
}

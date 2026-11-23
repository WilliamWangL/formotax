import { Injectable, NotFoundException } from '@nestjs/common';
import type { TaxFormSummaryDto, TaxFormVersionDto } from '@tax/shared-types';
import type { FormDefinition } from '@tax/shared-types';
import { getFormByCodeOrSlug, listForms, toSummary } from '@tax/tax-form-engine';
import { PrismaService } from '../common/prisma/prisma.module';
import { RedisService } from '../common/redis/redis.module';
import { TemplateStorageService } from '../common/storage/template-storage.service';

const LIST_CACHE_KEY = 'tax:forms:list';
const LIST_CACHE_TTL = 300;

export interface TaxFormDetail extends TaxFormSummaryDto {
  version: string;
  language: string;
  category: string;
  lastReviewed: string;
  officialUrl: string;
  instructionsUrl: string;
  templateRevision: string;
  templateSha256: string;
  effectiveDate: string | null;
  status: 'active' | 'archived';
  versions: TaxFormVersionDto[];
}

@Injectable()
export class TaxFormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: TemplateStorageService,
  ) {}

  async list(): Promise<TaxFormSummaryDto[]> {
    const cached = await this.redis.getJson<TaxFormSummaryDto[]>(LIST_CACHE_KEY);
    if (cached) return cached;

    let activeCodes: Set<string> | null = null;
    try {
      const rows = await this.prisma.taxForm.findMany({
        where: { status: 1 },
        select: { formCode: true },
      });
      if (rows.length > 0) activeCodes = new Set(rows.map((row) => row.formCode));
    } catch {
      // Database unavailable: fall back to the bundled definitions.
    }

    const forms = listForms()
      .filter((form) => !activeCodes || activeCodes.has(form.code))
      .map((form) => toSummary(form));

    await this.redis.setJson(LIST_CACHE_KEY, forms, LIST_CACHE_TTL);
    return forms;
  }

  async detail(codeOrSlug: string): Promise<TaxFormDetail> {
    const form = this.requireForm(codeOrSlug);
    const versions = await this.versionsOf(form);
    const active = versions.find((version) => version.status === 'active') ?? versions[0];

    return {
      ...toSummary(form),
      version: form.version,
      language: form.language,
      category: form.category,
      lastReviewed: form.lastReviewed,
      officialUrl: form.officialUrl,
      instructionsUrl: form.instructionsUrl,
      templateRevision: form.pdf.revision,
      templateSha256: form.pdf.sha256,
      effectiveDate: active?.effectiveDate ?? null,
      status: active?.status ?? 'active',
      versions,
    };
  }

  /** Field/step configuration for the requested revision. */
  async config(codeOrSlug: string, version?: string): Promise<Record<string, unknown>> {
    const form = this.requireForm(codeOrSlug);
    const cacheKey = `tax:form:${form.code}:config:${version ?? 'active'}`;
    const cached = await this.redis.getJson<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    let payload: Record<string, unknown> | null = null;
    try {
      const record = await this.prisma.taxFormVersion.findFirst({
        where: {
          version: version ?? undefined,
          form: { formCode: form.code },
          status: version ? undefined : 1,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (record) {
        payload = {
          code: form.code,
          version: record.version,
          revision: form.pdf.revision,
          templatePath: record.templatePath,
          config: record.configJson,
          mapping: record.mappingJson,
        };
      }
    } catch {
      // fall through to the bundled configuration
    }

    payload ??= {
      code: form.code,
      version: form.version,
      revision: form.pdf.revision,
      templatePath: form.pdf.path,
      config: { steps: form.steps, disclaimers: form.disclaimers },
      mapping: { fields: form.pdf.fields, optionGroups: form.pdf.optionGroups },
    };

    await this.redis.setJson(cacheKey, payload, LIST_CACHE_TTL);
    return payload;
  }

  async versions(codeOrSlug: string): Promise<TaxFormVersionDto[]> {
    return this.versionsOf(this.requireForm(codeOrSlug));
  }

  /** Resolves where the official PDF lives on the server's local disk. */
  async template(
    codeOrSlug: string,
    version?: string,
  ): Promise<{
    code: string;
    version: string;
    revision: string;
    templatePath: string;
    sha256: string;
    storage: 'bundled' | 'storage';
  }> {
    const form = this.requireForm(codeOrSlug);
    let templatePath = form.pdf.path;
    let resolvedVersion = form.version;

    try {
      const record = await this.prisma.taxFormVersion.findFirst({
        where: {
          form: { formCode: form.code },
          version: version ?? undefined,
          status: version ? undefined : 1,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (record) {
        templatePath = record.templatePath;
        resolvedVersion = record.version;
      }
    } catch {
      // bundled path is the fallback
    }

    return {
      code: form.code,
      version: resolvedVersion,
      revision: form.pdf.revision,
      templatePath,
      sha256: form.pdf.sha256,
      storage: this.storage.isOverride(templatePath) ? 'storage' : 'bundled',
    };
  }

  /** Drops cached configuration after an admin changes a version. */
  async invalidate(code?: string): Promise<void> {
    await this.redis.del(LIST_CACHE_KEY);
    if (code) await this.redis.delByPrefix(`tax:form:${code.toUpperCase()}`);
    else await this.redis.delByPrefix('tax:form:');
  }

  private requireForm(codeOrSlug: string): FormDefinition {
    const form = getFormByCodeOrSlug(codeOrSlug);
    if (!form) {
      throw new NotFoundException({
        code: 'FORM_NOT_FOUND',
        message: `No tax form is available for "${codeOrSlug}".`,
      });
    }
    return form;
  }

  private async versionsOf(form: FormDefinition): Promise<TaxFormVersionDto[]> {
    try {
      const records = await this.prisma.taxFormVersion.findMany({
        where: { form: { formCode: form.code } },
        orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
      });
      if (records.length > 0) {
        return records.map((record) => ({
          version: record.version,
          revision: form.pdf.revision,
          officialUrl: form.officialUrl,
          effectiveDate: record.effectiveDate ? record.effectiveDate.toISOString().slice(0, 10) : null,
          status: record.status === 1 ? 'active' : 'archived',
        }));
      }
    } catch {
      // Database unavailable: report the bundled version.
    }

    return [
      {
        version: form.version,
        revision: form.pdf.revision,
        officialUrl: form.officialUrl,
        effectiveDate: `${form.version}-01-01`,
        status: 'active',
      },
    ];
  }
}

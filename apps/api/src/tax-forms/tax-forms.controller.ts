import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import type { TaxFormSummaryDto, TaxFormVersionDto } from '@tax/shared-types';
import { Public } from '../common/auth/auth.decorators';
import { TemplateStorageService } from '../common/storage/template-storage.service';
import { TaxFormsService, type TaxFormDetail } from './tax-forms.service';

@Public()
@Controller('tax-forms')
export class TaxFormsController {
  constructor(
    private readonly forms: TaxFormsService,
    private readonly storage: TemplateStorageService,
  ) {}

  @Get()
  list(): Promise<TaxFormSummaryDto[]> {
    return this.forms.list();
  }

  @Get(':code')
  detail(@Param('code') code: string): Promise<TaxFormDetail> {
    return this.forms.detail(code);
  }

  @Get(':code/config')
  config(@Param('code') code: string, @Query('version') version?: string) {
    return this.forms.config(code, version);
  }

  @Get(':code/versions')
  versions(@Param('code') code: string): Promise<TaxFormVersionDto[]> {
    return this.forms.versions(code);
  }

  /**
   * Streams the official template from the server's local disk. Files in
   * `${STORAGE_DIR}/templates` take precedence over the bundled copies so a new
   * IRS revision can be published without a rebuild.
   */
  @Get(':code/template')
  @Header('Cache-Control', 'private, no-store')
  async template(
    @Param('code') code: string,
    @Query('version') version: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const template = await this.forms.template(code, version);

    if (!this.storage.exists(template.templatePath)) {
      throw new NotFoundException({
        code: 'TEMPLATE_NOT_FOUND',
        message: `The PDF template for ${template.code} is not available on this server.`,
      });
    }

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${template.code}-${template.version}.pdf"`,
    );
    response.setHeader('X-Template-Revision', template.revision);
    response.setHeader('X-Template-Sha256', template.sha256);
    response.setHeader('X-Template-Storage', template.storage);

    return new StreamableFile(this.storage.stream(template.templatePath));
  }
}

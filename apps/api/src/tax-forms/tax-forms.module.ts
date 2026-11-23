import { Module } from '@nestjs/common';
import { TaxFormsController } from './tax-forms.controller';
import { TaxFormsService } from './tax-forms.service';

@Module({
  controllers: [TaxFormsController],
  providers: [TaxFormsService],
  exports: [TaxFormsService],
})
export class TaxFormsModule {}

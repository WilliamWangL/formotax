import { Module } from '@nestjs/common';
import { UserTaxFormsController } from './user-tax-forms.controller';
import { UserTaxFormsService } from './user-tax-forms.service';

@Module({
  controllers: [UserTaxFormsController],
  providers: [UserTaxFormsService],
})
export class UserTaxFormsModule {}

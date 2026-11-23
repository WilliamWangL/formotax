import { Module } from '@nestjs/common';
import { TaxFormsModule } from '../tax-forms/tax-forms.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TaxFormsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

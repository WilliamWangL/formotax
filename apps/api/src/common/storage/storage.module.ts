import { Global, Module } from '@nestjs/common';
import { TemplateStorageService } from './template-storage.service';

@Global()
@Module({
  providers: [TemplateStorageService],
  exports: [TemplateStorageService],
})
export class StorageModule {}

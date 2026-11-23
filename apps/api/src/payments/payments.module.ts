import { Module } from '@nestjs/common';
import { DownloadsController } from './downloads.controller';
import { PaymentProviderRegistry } from './payment-provider.registry';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PayPalPaymentProvider } from './providers/paypal.provider';

@Module({
  controllers: [PaymentsController, DownloadsController],
  providers: [PayPalPaymentProvider, PaymentProviderRegistry, PaymentsService],
  exports: [PaymentsService, PaymentProviderRegistry],
})
export class PaymentsModule {}

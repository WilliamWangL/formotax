import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PayPalPaymentProvider } from './providers/paypal.provider';
import type { PaymentProvider } from './providers/payment-provider.types';

/**
 * PayPal is the only payment method. There is no fallback adapter: when the
 * credentials are missing, checkout fails loudly instead of quietly accepting
 * orders that nobody pays for.
 */
@Injectable()
export class PaymentProviderRegistry {
  private readonly logger = new Logger(PaymentProviderRegistry.name);
  readonly name = 'paypal';

  constructor(private readonly paypal: PayPalPaymentProvider) {
    if (!paypal.configured) {
      this.logger.warn(
        'PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET are empty; download checkout will refuse new orders.',
      );
    }
  }

  /** Resolves the adapter by name; every order row stores `paypal`. */
  get(name?: string): PaymentProvider {
    if (name && name.toLowerCase() !== this.name) {
      throw new BadRequestException({
        code: 'PROVIDER_NOT_SUPPORTED',
        message: `"${name}" is not supported. PayPal is the only payment method.`,
      });
    }
    return this.paypal;
  }

  /** Used when starting a new purchase: refuses to sell without credentials. */
  checkout(): PaymentProvider {
    if (!this.paypal.configured) {
      // The startup warning carries the operator-facing detail; the API
      // response stays suitable for the end user.
      throw new BadRequestException({
        code: 'PAYMENT_NOT_CONFIGURED',
        message: 'Payments are temporarily unavailable. Please try again later.',
      });
    }
    return this.paypal;
  }
}

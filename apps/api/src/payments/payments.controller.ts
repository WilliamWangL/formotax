import { Controller, HttpCode, HttpStatus, Post, Req, type RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/auth/auth.decorators';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * PayPal callback. The raw body is required for signature verification,
   * which is why main.ts enables Nest's rawBody support. PayPal is the only
   * supported payment method, so the route is not parameterised.
   */
  @Public()
  @Post('webhook/paypal')
  @HttpCode(HttpStatus.OK)
  webhook(
    @Req() request: RawBodyRequest<Request>,
  ): Promise<{ received: true; processed: boolean; orderNo?: string }> {
    const rawBody = request.rawBody ?? Buffer.from(JSON.stringify(request.body ?? {}));
    return this.payments.handleWebhook(request.headers, rawBody);
  }
}

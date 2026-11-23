import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { env } from '../../common/env';
import type {
  CaptureInput,
  CaptureResult,
  CheckoutSession,
  CreateCheckoutInput,
  PaymentProvider,
  WebhookEvent,
} from './payment-provider.types';

interface PayPalLink {
  href: string;
  rel: string;
}

interface PayPalCapture {
  id: string;
  status: string;
  amount?: { value?: string; currency_code?: string };
  custom_id?: string;
}

interface PayPalOrder {
  id: string;
  status: string;
  links?: PayPalLink[];
  purchase_units?: Array<{ payments?: { captures?: PayPalCapture[] } }>;
}

interface PayPalWebhookResource extends PayPalCapture {
  supplementary_data?: { related_ids?: { order_id?: string } };
}

interface PayPalWebhookPayload {
  id?: string;
  event_type?: string;
  resource?: PayPalWebhookResource;
}

/**
 * PayPal adapter (Orders v2 REST API, no SDK).
 *
 * Flow: create an order with `intent=CAPTURE`, redirect the buyer to the
 * PayPal-hosted approval page, then capture the approved order from the
 * browser return URL. The capture call is what charges the buyer, so the
 * webhook and the return URL both funnel through `captureOrder()` and the
 * fulfilment underneath is idempotent.
 */
@Injectable()
export class PayPalPaymentProvider implements PaymentProvider {
  readonly name = 'paypal';
  private readonly logger = new Logger(PayPalPaymentProvider.name);
  private token: { value: string; expiresAt: number } | null = null;

  private get config() {
    return env.payments.paypal;
  }

  get configured(): boolean {
    return Boolean(this.config.clientId && this.config.clientSecret);
  }

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession> {
    const settings = this.config;
    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: input.order.orderNo,
          custom_id: input.order.orderNo,
          invoice_id: input.order.orderNo,
          description: `${settings.brandName} — ${input.order.description}`.slice(0, 127),
          amount: {
            currency_code: input.order.currency.toUpperCase(),
            value: input.order.amount,
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: settings.brandName,
            locale: 'en-US',
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            return_url: input.successUrl,
            cancel_url: input.cancelUrl,
          },
        },
      },
    };

    const order = await this.request<PayPalOrder>('/v2/checkout/orders', {
      method: 'POST',
      headers: { 'PayPal-Request-Id': `${input.order.orderNo}-create` },
      body: JSON.stringify(payload),
    });

    const approve = order.links?.find((link) => link.rel === 'payer-action' || link.rel === 'approve');
    if (!approve) {
      throw new BadRequestException({
        code: 'CHECKOUT_UNAVAILABLE',
        message: 'PayPal did not return an approval URL for this order.',
      });
    }

    this.logger.log(`PayPal order ${order.id} created for ${input.order.orderNo}.`);
    return { provider: this.name, providerSessionId: order.id, checkoutUrl: approve.href };
  }

  /** Charges a buyer-approved order. Safe to call twice: an already captured
   *  order is reported back as completed instead of raising an error. */
  async captureOrder(input: CaptureInput): Promise<CaptureResult> {
    const path = `/v2/checkout/orders/${encodeURIComponent(input.providerSessionId)}/capture`;
    const response = await this.rawRequest(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `${input.orderNo}-capture`,
      },
      body: '{}',
    });

    if (response.status === 422) {
      const failure = (await response.json().catch(() => ({}))) as {
        details?: Array<{ issue?: string }>;
      };
      const alreadyCaptured = (failure.details ?? []).some(
        (detail) => detail.issue === 'ORDER_ALREADY_CAPTURED',
      );
      if (alreadyCaptured) {
        const order = await this.getOrder(input.providerSessionId);
        return this.toCaptureResult(order);
      }
      this.logger.warn(`PayPal capture failed for ${input.orderNo}: ${JSON.stringify(failure)}`);
      return { status: 'failed', raw: failure };
    }

    if (!response.ok) {
      const failure = await response.text();
      this.logger.error(`PayPal capture error ${response.status} for ${input.orderNo}: ${failure}`);
      throw new BadRequestException({
        code: 'PAYMENT_CAPTURE_FAILED',
        message: 'PayPal could not capture this payment. Please try again.',
      });
    }

    return this.toCaptureResult((await response.json()) as PayPalOrder);
  }

  async verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
  ): Promise<WebhookEvent> {
    const header = (name: string): string => {
      const value = headers[name];
      return (Array.isArray(value) ? value[0] : value) ?? '';
    };

    const authAlgo = header('paypal-auth-algo');
    const certUrl = header('paypal-cert-url');
    const transmissionId = header('paypal-transmission-id');
    const transmissionSig = header('paypal-transmission-sig');
    const transmissionTime = header('paypal-transmission-time');
    const webhookId = this.config.webhookId;

    if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime || !webhookId) {
      throw new BadRequestException({
        code: 'INVALID_SIGNATURE',
        message: 'The PayPal signature headers or PAYPAL_WEBHOOK_ID are missing.',
      });
    }

    let payload: PayPalWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as PayPalWebhookPayload;
    } catch {
      throw new BadRequestException({ code: 'INVALID_PAYLOAD', message: 'The webhook body is not JSON.' });
    }

    const verification = await this.request<{ verification_status?: string }>(
      '/v1/notifications/verify-webhook-signature',
      {
        method: 'POST',
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: payload,
        }),
      },
    );

    if (verification.verification_status !== 'SUCCESS') {
      throw new BadRequestException({
        code: 'INVALID_SIGNATURE',
        message: 'The PayPal webhook signature could not be verified.',
      });
    }

    const resource: PayPalWebhookResource = payload.resource ?? { id: '', status: '' };
    const orderNo = resource.custom_id ?? resource.supplementary_data?.related_ids?.order_id;

    switch (payload.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        return {
          type: 'payment.succeeded',
          orderNo: resource.custom_id,
          transactionId: resource.id,
          amount: resource.amount?.value,
          raw: payload,
        };
      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.DECLINED':
        return { type: 'payment.failed', orderNo, raw: payload };
      default:
        return { type: 'ignored', raw: payload };
    }
  }

  private async getOrder(providerSessionId: string): Promise<PayPalOrder> {
    return this.request<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(providerSessionId)}`);
  }

  private toCaptureResult(order: PayPalOrder): CaptureResult {
    const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
    if (order.status === 'COMPLETED' && capture) {
      return {
        status: 'completed',
        transactionId: capture.id,
        amount: capture.amount?.value,
        raw: order,
      };
    }
    if (order.status === 'PENDING' || capture?.status === 'PENDING') {
      return { status: 'pending', transactionId: capture?.id, amount: capture?.amount?.value, raw: order };
    }
    return { status: 'failed', raw: order };
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.rawRequest(path, init);
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(`PayPal ${path} failed with ${response.status}: ${body.slice(0, 400)}`);
      throw new BadRequestException({
        code: 'PROVIDER_ERROR',
        message: 'PayPal rejected this request. Check the API credentials and try again.',
      });
    }
    return (await response.json()) as T;
  }

  private async rawRequest(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.accessToken();
    try {
      return await fetch(`${this.config.baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(init.headers ?? {}),
        },
      });
    } catch (error) {
      this.logger.error(`PayPal is unreachable: ${(error as Error).message}`);
      throw new BadRequestException({
        code: 'PROVIDER_UNAVAILABLE',
        message: 'PayPal is not reachable right now. Please try again shortly.',
      });
    }
  }

  private async accessToken(): Promise<string> {
    if (!this.configured) {
      throw new BadRequestException({
        code: 'PROVIDER_NOT_CONFIGURED',
        message: 'PayPal is not configured on this deployment.',
      });
    }
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;

    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString('base64');

    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
    } catch (error) {
      this.logger.error(`PayPal token endpoint unreachable: ${(error as Error).message}`);
      throw new BadRequestException({
        code: 'PROVIDER_UNAVAILABLE',
        message: 'PayPal is not reachable right now. Please try again shortly.',
      });
    }

    if (!response.ok) {
      this.logger.error(`PayPal token request failed with ${response.status}.`);
      throw new BadRequestException({
        code: 'PROVIDER_ERROR',
        message: 'PayPal rejected the API credentials.',
      });
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.token = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return this.token.value;
  }
}

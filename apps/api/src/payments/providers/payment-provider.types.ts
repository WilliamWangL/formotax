export interface CheckoutOrder {
  orderNo: string;
  amount: string;
  currency: string;
  /** What the buyer is paying for, shown in the provider checkout. */
  description: string;
  /** IRS form code the purchase unlocks. */
  formCode: string;
}

export interface CheckoutCustomer {
  id: string;
  email: string;
}

export interface CreateCheckoutInput {
  order: CheckoutOrder;
  customer: CheckoutCustomer;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  provider: string;
  providerSessionId: string;
  checkoutUrl: string;
}

export type WebhookEventType = 'payment.succeeded' | 'payment.failed' | 'ignored';

export interface WebhookEvent {
  type: WebhookEventType;
  orderNo?: string;
  transactionId?: string;
  amount?: string;
  raw: unknown;
}

export interface CaptureInput {
  orderNo: string;
  /** Provider-side identifier returned by createCheckoutSession. */
  providerSessionId: string;
}

export type CaptureStatus = 'completed' | 'pending' | 'failed';

export interface CaptureResult {
  status: CaptureStatus;
  transactionId?: string;
  amount?: string;
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession>;
  /** Verifies the provider signature; throws when the payload is not authentic. */
  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
  ): WebhookEvent | Promise<WebhookEvent>;
  /**
   * Captures an approved checkout. PayPal charges the buyer only after this
   * call, so the browser return URL and the webhook both funnel through here
   * and fulfilment stays idempotent.
   */
  captureOrder(input: CaptureInput): Promise<CaptureResult>;
}

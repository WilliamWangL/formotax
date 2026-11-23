import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type {
  DownloadAccessDto,
  DownloadCheckoutDto,
  DownloadOrderDto,
  OrderStatus,
} from '@tax/shared-types';
import { FORM_DEFINITIONS } from '@tax/tax-form-engine';
import { env } from '../common/env';
import { PrismaService } from '../common/prisma/prisma.module';
import { PaymentProviderRegistry } from './payment-provider.registry';

const CURRENCY = 'USD';
const ACCESS_HOURS = env.download.accessHours;

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

/**
 * Pay-per-download billing. Filling and previewing a form never touches this
 * service; an order is only created when the visitor saves the PDF. Paying
 * unlocks that form for `ACCESS_HOURS`, so re-downloading the same document in
 * the window is free.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: PaymentProviderRegistry,
  ) {}

  /** Whether the user can download this form right now without paying again. */
  async access(userId: string, formCode: string): Promise<DownloadAccessDto> {
    const code = this.assertFormCode(formCode);
    const order = await this.prisma.paymentOrder.findFirst({
      where: {
        userId: BigInt(userId),
        formCode: code,
        status: 'paid',
        accessExpiresAt: { gt: new Date() },
      },
      orderBy: { accessExpiresAt: 'desc' },
    });

    return {
      active: Boolean(order),
      orderNo: order?.orderNo ?? null,
      paidAt: order?.paidAt ? order.paidAt.toISOString() : null,
      expiresAt: order?.accessExpiresAt ? order.accessExpiresAt.toISOString() : null,
      price: env.download.priceUsd.toFixed(2),
      currency: CURRENCY,
      accessHours: ACCESS_HOURS,
    };
  }

  /** Creates a pending order and asks the adapter for a checkout URL. */
  async createDownloadOrder(
    userId: string,
    formCode: string,
    options: { successUrl?: string; cancelUrl?: string } = {},
  ): Promise<DownloadCheckoutDto> {
    const user = await this.prisma.user.findUnique({ where: { id: BigInt(userId) } });
    if (!user || user.deletedAt) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Account not found.' });
    }

    const code = this.assertFormCode(formCode);
    const form = FORM_DEFINITIONS.find((item) => item.code === code);
    const provider = this.registry.checkout();
    const orderNo = this.newOrderNumber();
    const amount = env.download.priceUsd.toFixed(2);

    await this.prisma.paymentOrder.create({
      data: {
        orderNo,
        userId: user.id,
        formCode: code,
        amount,
        currency: CURRENCY,
        provider: provider.name,
        status: 'pending',
      },
    });

    const session = await provider.createCheckoutSession({
      order: {
        orderNo,
        amount,
        currency: CURRENCY,
        description: `${form?.shortTitle ?? code} PDF download`,
        formCode: code,
      },
      customer: { id: user.id.toString(), email: user.email },
      successUrl: options.successUrl ?? `${env.webUrl}/downloads/return?order=${orderNo}`,
      cancelUrl:
        options.cancelUrl ?? `${env.webUrl}/downloads/return?order=${orderNo}&cancelled=1`,
    });

    // Keep the provider's order id so an approved checkout can be captured from
    // the browser return URL, even when the webhook arrives later.
    await this.prisma.paymentOrder.update({
      where: { orderNo },
      data: { providerSessionId: session.providerSessionId },
    });

    return {
      orderNo,
      checkoutUrl: session.checkoutUrl,
      provider: provider.name,
      amount,
      currency: CURRENCY,
    };
  }

  async listOrders(userId: string, page: number, pageSize: number) {
    const where = { userId: BigInt(userId) };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.paymentOrder.count({ where }),
      this.prisma.paymentOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row)),
      page,
      pageSize,
      total,
    };
  }

  async findOrder(userId: string, orderNo: string): Promise<DownloadOrderDto> {
    const row = await this.prisma.paymentOrder.findFirst({
      where: { orderNo, userId: BigInt(userId) },
    });
    if (!row) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    }
    return this.toDto(row);
  }

  /**
   * Verifies the provider signature and applies the event. Fulfilment is
   * idempotent: replaying a webhook for a paid order changes nothing.
   */
  async handleWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
  ): Promise<{ received: true; processed: boolean; orderNo?: string }> {
    const provider = this.registry.get();
    const event = await provider.verifyWebhook(headers, rawBody);

    if (event.type === 'payment.succeeded' && event.orderNo) {
      await this.fulfill(event.orderNo, event.transactionId, event.raw, provider.name);
      return { received: true, processed: true, orderNo: event.orderNo };
    }

    if (event.type === 'payment.failed' && event.orderNo) {
      await this.prisma.paymentOrder.updateMany({
        where: { orderNo: event.orderNo, status: 'pending' },
        data: { status: 'failed' },
      });
      return { received: true, processed: true, orderNo: event.orderNo };
    }

    return { received: true, processed: false };
  }

  /**
   * Captures a buyer-approved checkout. PayPal charges the buyer here, so the
   * return page calls this right after the redirect. A webhook can arrive
   * before or after; `fulfill()` only pays a pending order once.
   */
  async captureOrder(userId: string, orderNo: string): Promise<DownloadOrderDto> {
    const order = await this.prisma.paymentOrder.findFirst({
      where: { orderNo, userId: BigInt(userId) },
    });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    }
    if (order.status === 'paid') {
      return this.toDto(order);
    }
    if (order.status === 'failed') {
      throw new BadRequestException({
        code: 'PAYMENT_FAILED',
        message: 'This payment did not complete. Start a new checkout to retry.',
      });
    }

    const provider = this.registry.get(order.provider);
    if (!order.providerSessionId) {
      throw new BadRequestException({
        code: 'CAPTURE_NOT_AVAILABLE',
        message: 'This order has no provider reference yet. Start a new checkout.',
      });
    }

    const result = await provider.captureOrder({
      orderNo,
      providerSessionId: order.providerSessionId,
    });

    if (result.status === 'failed') {
      await this.prisma.paymentOrder.updateMany({
        where: { id: order.id, status: 'pending' },
        data: { status: 'failed' },
      });
      throw new BadRequestException({
        code: 'PAYMENT_FAILED',
        message: 'The payment was not completed. Open the checkout again to retry.',
      });
    }

    if (result.status === 'completed') {
      const expected = order.amount.toFixed(2);
      if (result.amount && result.amount !== expected) {
        this.logger.warn(
          `Captured ${result.amount} ${order.currency} for ${orderNo} but the order expects ${expected}; granting the order amount.`,
        );
      }
      await this.fulfill(orderNo, result.transactionId, result.raw, provider.name);
    }

    const refreshed = await this.prisma.paymentOrder.findUniqueOrThrow({
      where: { id: order.id },
    });
    return this.toDto(refreshed);
  }

  /**
   * Marks the order paid and opens the re-download window. Runs in a single
   * transaction and is a no-op for an order that is already paid.
   */
  async fulfill(
    orderNo: string,
    transactionId: string | undefined,
    callbackData: unknown,
    providerName: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.paymentOrder.findUnique({ where: { orderNo } });
      if (!order || order.status === 'paid') return;

      const paidAt = new Date();
      const accessExpiresAt = addHours(paidAt, ACCESS_HOURS);
      await tx.paymentOrder.update({
        where: { id: order.id },
        data: { status: 'paid', paidAt, accessExpiresAt },
      });

      const reference = transactionId ?? `${providerName}_${orderNo}_${paidAt.getTime()}`;
      await tx.paymentTransaction.upsert({
        where: { transactionId: reference },
        update: { status: 'succeeded', callbackData: callbackData as object },
        create: {
          orderId: order.id,
          transactionId: reference,
          provider: providerName,
          amount: order.amount,
          status: 'succeeded',
          callbackData: callbackData as object,
        },
      });

      // Download history only: the form code, never the answers.
      await tx.usageLog.create({
        data: {
          userId: order.userId,
          action: 'download',
          formCode: order.formCode,
          quantity: 1,
        },
      });
    });
  }

  private assertFormCode(value: string): string {
    const code = (value ?? '').trim().toUpperCase();
    if (!FORM_DEFINITIONS.some((form) => form.code === code)) {
      throw new BadRequestException({
        code: 'FORM_NOT_SUPPORTED',
        message: `"${value}" is not a supported form.`,
      });
    }
    return code;
  }

  private newOrderNumber(): string {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `TF${stamp}${randomBytes(5).toString('hex').toUpperCase()}`;
  }

  private toDto(order: {
    orderNo: string;
    formCode: string | null;
    amount: { toFixed(digits: number): string };
    currency: string;
    provider: string;
    status: string;
    paidAt: Date | null;
    accessExpiresAt: Date | null;
    createdAt: Date;
  }): DownloadOrderDto {
    const statuses: OrderStatus[] = ['pending', 'paid', 'failed', 'refunded'];
    return {
      orderNo: order.orderNo,
      formCode: order.formCode ?? '',
      amount: order.amount.toFixed(2),
      currency: order.currency,
      provider: order.provider,
      status: statuses.includes(order.status as OrderStatus)
        ? (order.status as OrderStatus)
        : 'pending',
      paidAt: order.paidAt ? order.paidAt.toISOString() : null,
      accessExpiresAt: order.accessExpiresAt ? order.accessExpiresAt.toISOString() : null,
      createdAt: order.createdAt.toISOString(),
    };
  }
}

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import type { DownloadOrderDto } from '@tax/shared-types';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { captureDownloadOrder, readTokens } from '@/lib/api';
import { savePass } from '@/lib/downloads';

type ReturnState = 'capturing' | 'paid' | 'cancelled' | 'failed' | 'signed-out';

/**
 * Landing page for the provider redirect. Capturing here charges an approved
 * PayPal order, so this is the only place that finishes the payment when the
 * webhook has not arrived yet. The fill page polls the order in parallel and
 * unlocks as soon as it is paid.
 */
export function DownloadReturn() {
  const params = useSearchParams();
  const orderNo = params.get('order') ?? '';
  const cancelled = params.get('cancelled') === '1';
  const [state, setState] = useState<ReturnState>(cancelled ? 'cancelled' : 'capturing');
  const [order, setOrder] = useState<DownloadOrderDto | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cancelled) return;
    if (!orderNo) {
      setState('failed');
      setMessage('The order reference is missing from this link.');
      return;
    }
    if (!readTokens()) {
      setState('signed-out');
      return;
    }

    let active = true;
    captureDownloadOrder(orderNo)
      .then((result) => {
        if (!active) return;
        setOrder(result);
        if (result.status === 'paid') {
          if (result.accessExpiresAt) {
            savePass({
              formCode: result.formCode,
              orderNo: result.orderNo,
              expiresAt: result.accessExpiresAt,
            });
          }
          setState('paid');
        } else {
          setState('failed');
          setMessage('The payment has not been confirmed yet. Refresh this page in a moment.');
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState('failed');
        setMessage(
          error instanceof Error
            ? error.message
            : 'We could not confirm the payment. Refresh this page in a moment.',
        );
      });

    return () => {
      active = false;
    };
  }, [cancelled, orderNo]);

  const fillPath = order?.formCode ? `/forms/${order.formCode.toLowerCase()}/fill` : '/tax-forms';

  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-14">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-4 text-center">
          {state === 'capturing' ? (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" aria-hidden />
              <h1 className="text-xl font-semibold text-ink">Confirming your payment…</h1>
              <p className="text-sm leading-6 text-slate-600">
                Keep this window open for a few seconds. The form unlocks as soon as the payment
                is confirmed.
              </p>
            </>
          ) : null}

          {state === 'paid' ? (
            <>
              <CheckCircle2 className="mx-auto h-8 w-8 text-brand-600" aria-hidden />
              <h1 className="text-xl font-semibold text-ink">Payment received</h1>
              <p className="text-sm leading-6 text-slate-600">
                {order?.formCode || 'This form'} is unlocked
                {order?.accessExpiresAt
                  ? ` until ${new Date(order.accessExpiresAt).toLocaleString('en-US')}`
                  : ' for the re-download window'}
                . Return to the form to save your PDF — your answers were kept in the browser.
              </p>
              <div className="flex flex-col gap-2">
                <ButtonLink href={fillPath}>Back to the form</ButtonLink>
                <Button variant="outline" onClick={() => window.close()}>
                  Close this window
                </Button>
              </div>
            </>
          ) : null}

          {state === 'cancelled' ? (
            <>
              <XCircle className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
              <h1 className="text-xl font-semibold text-ink">Payment cancelled</h1>
              <p className="text-sm leading-6 text-slate-600">
                Nothing was charged. Your answers are still saved in this browser, so you can try
                again whenever you are ready.
              </p>
              <ButtonLink href={fillPath} variant="outline">
                Back to the form
              </ButtonLink>
            </>
          ) : null}

          {state === 'failed' ? (
            <>
              <XCircle className="mx-auto h-8 w-8 text-red-500" aria-hidden />
              <h1 className="text-xl font-semibold text-ink">We could not confirm the payment</h1>
              <p className="text-sm leading-6 text-slate-600">{message}</p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => window.location.reload()}>Try again</Button>
                <ButtonLink href={fillPath} variant="outline">
                  Back to the form
                </ButtonLink>
              </div>
            </>
          ) : null}

          {state === 'signed-out' ? (
            <>
              <XCircle className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
              <h1 className="text-xl font-semibold text-ink">Please sign in again</h1>
              <p className="text-sm leading-6 text-slate-600">
                This payment was made for an account that is no longer signed in on this browser.
                Sign in with the same email to finish the download.
              </p>
              <ButtonLink href={`/login?next=${encodeURIComponent(fillPath)}`}>
                Sign in
              </ButtonLink>
            </>
          ) : null}

          {orderNo ? (
            <p className="text-xs text-slate-400">
              Order {orderNo} ·{' '}
              <Link href="/pricing" className="underline">
                Pricing
              </Link>
            </p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

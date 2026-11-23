'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Download, Loader2, Receipt } from 'lucide-react';
import type { DownloadOrderDto } from '@tax/shared-types';
import { fillPath, listForms } from '@tax/tax-form-engine';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/features/dashboard/session';
import { fetchDownloadOrders } from '@/lib/api';
import { readPasses, type DownloadPass } from '@/lib/downloads';
import { downloadOffer } from '@/lib/site';

const forms = listForms();

function formLabel(code: string): string {
  return forms.find((form) => form.code === code)?.shortTitle ?? (code || 'Earlier purchase');
}

export function DownloadsPanel() {
  const { apiReachable } = useSession();
  const [orders, setOrders] = useState<DownloadOrderDto[]>([]);
  const [passes, setPasses] = useState<DownloadPass[]>([]);
  const [loading, setLoading] = useState(apiReachable);

  useEffect(() => {
    setPasses(readPasses());
  }, []);

  useEffect(() => {
    if (!apiReachable) return;
    let active = true;
    fetchDownloadOrders()
      .then((data) => {
        if (active) setOrders(data.items);
      })
      .catch(() => {
        /* the local passes below still show what is unlocked here */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiReachable]);

  const activeOrders = orders.filter(
    (order) =>
      order.status === 'paid' &&
      order.accessExpiresAt !== null &&
      new Date(order.accessExpiresAt).getTime() > Date.now(),
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Downloads</h1>
        <p className="mt-1 text-sm text-slate-600">
          Every download costs ${downloadOffer.price.toFixed(2)} and stays unlocked for{' '}
          {downloadOffer.accessHours} hours. Filling and previewing forms is always free.
        </p>
      </header>

      {loading ? (
        <p className="flex items-center text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          Loading your purchases…
        </p>
      ) : null}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Unlocked now</CardTitle>
          <Download className="h-4 w-4 text-slate-400" aria-hidden />
        </CardHeader>
        <CardBody className="p-0">
          {activeOrders.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {activeOrders.map((order) => {
                const form = forms.find((item) => item.code === order.formCode);
                return (
                  <li
                    key={order.orderNo}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">{formLabel(order.formCode)}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Re-download free until{' '}
                        {new Date(order.accessExpiresAt as string).toLocaleString('en-US')}
                      </p>
                    </div>
                    {form ? (
                      <Link
                        href={fillPath(form)}
                        className="text-xs font-semibold text-brand-700 underline"
                      >
                        Open the form
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : passes.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {passes.map((pass) => (
                <li
                  key={pass.orderNo}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{formLabel(pass.formCode)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Unlocked on this device until{' '}
                      {new Date(pass.expiresAt).toLocaleString('en-US')}
                    </p>
                  </div>
                  <Link
                    href={`/forms/${pass.formCode.toLowerCase()}/fill`}
                    className="text-xs font-semibold text-brand-700 underline"
                  >
                    Open the form
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-slate-500">
              Nothing is unlocked right now. Fill a form and pay once to download it — you can
              re-download the same document for {downloadOffer.accessHours} hours.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Purchase history</CardTitle>
          <Receipt className="h-4 w-4 text-slate-400" aria-hidden />
        </CardHeader>
        <CardBody className="p-0">
          {orders.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {orders.map((order) => (
                <li
                  key={order.orderNo}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {formLabel(order.formCode)} · ${order.amount}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {order.orderNo} · {new Date(order.createdAt).toLocaleString('en-US')}
                    </p>
                  </div>
                  <Badge tone={order.status === 'paid' ? 'brand' : 'neutral'}>{order.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-slate-500">
              No purchases yet. Filling and previewing a form never creates an order.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

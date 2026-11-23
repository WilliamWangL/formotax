'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, FileText, Receipt, Tag } from 'lucide-react';
import type { DownloadOrderDto } from '@tax/shared-types';
import { fillPath, listForms, toSummary } from '@tax/tax-form-engine';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { ButtonLink } from '@/components/ui/button';
import { useSession } from '@/features/dashboard/session';
import { fetchDownloadOrders } from '@/lib/api';
import { readPasses } from '@/lib/downloads';
import { listDrafts, type DraftSummary } from '@/lib/draft';
import { downloadOffer } from '@/lib/site';

const forms = listForms();

export function OverviewPanel() {
  const { user, apiReachable } = useSession();
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [activeOrders, setActiveOrders] = useState<DownloadOrderDto[]>([]);
  const [localUnlocked, setLocalUnlocked] = useState(0);

  useEffect(() => {
    setDrafts(listDrafts().slice(0, 4));
    setLocalUnlocked(readPasses().length);
  }, []);

  useEffect(() => {
    if (!apiReachable) return;
    let active = true;
    fetchDownloadOrders()
      .then((data) => {
        if (!active) return;
        setActiveOrders(
          data.items.filter(
            (order) =>
              order.status === 'paid' &&
              order.accessExpiresAt !== null &&
              new Date(order.accessExpiresAt).getTime() > Date.now(),
          ),
        );
      })
      .catch(() => {
        /* the device counter below still shows what is unlocked here */
      });
    return () => {
      active = false;
    };
  }, [apiReachable]);

  const unlocked = Math.max(activeOrders.length, localUnlocked);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {user?.email ? `Welcome back` : 'Your dashboard'}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Start a form, pick up a draft or check which documents are still unlocked for
          re-download. Filling and previewing never costs anything.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Price</p>
              <Tag className="h-4 w-4 text-brand-500" aria-hidden />
            </div>
            <p className="mt-3 text-2xl font-semibold text-ink">
              ${downloadOffer.price.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              per downloaded PDF · ${downloadOffer.price.toFixed(2)} only, no subscription
            </p>
            <Link href="/pricing" className="mt-3 inline-flex text-xs font-medium text-brand-700 underline">
              See pricing
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Unlocked
              </p>
              <Receipt className="h-4 w-4 text-brand-500" aria-hidden />
            </div>
            <p className="mt-3 text-2xl font-semibold text-ink">{unlocked}</p>
            <p className="mt-1 text-xs text-slate-500">
              {activeOrders[0]?.accessExpiresAt
                ? `Next window ends ${new Date(activeOrders[0].accessExpiresAt).toLocaleString('en-US')}`
                : `Re-download a paid form free for ${downloadOffer.accessHours} hours`}
            </p>
            <Link href="/dashboard/downloads" className="mt-3 inline-flex text-xs font-medium text-brand-700 underline">
              View downloads
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Drafts</p>
              <FileText className="h-4 w-4 text-brand-500" aria-hidden />
            </div>
            <p className="mt-3 text-2xl font-semibold text-ink">{drafts.length}</p>
            <p className="mt-1 text-xs text-slate-500">Stored locally, signatures excluded</p>
            <Link href="/dashboard/forms" className="mt-3 inline-flex text-xs font-medium text-brand-700 underline">
              View drafts
            </Link>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Start a form</CardTitle>
          <Badge tone="brand">Official IRS PDFs</Badge>
        </CardHeader>
        <CardBody className="divide-y divide-slate-100 p-0">
          {forms.map((form) => {
            const summary = toSummary(form);
            return (
              <div key={form.code} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{summary.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Revision {form.pdf.revision} · about {summary.estimatedMinutes} minutes
                  </p>
                </div>
                <ButtonLink href={fillPath(form)} size="sm" variant="outline">
                  Fill out
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </ButtonLink>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent drafts</CardTitle>
          <Link href="/dashboard/forms" className="text-xs font-medium text-brand-700 underline">
            All drafts
          </Link>
        </CardHeader>
        <CardBody>
          {drafts.length === 0 ? (
            <p className="text-sm text-slate-500">
              No drafts yet. Progress is saved in this browser while you fill a form.
            </p>
          ) : (
            <ul className="space-y-3">
              {drafts.map((draft) => {
                const form = forms.find((item) => item.code === draft.code);
                return (
                  <li key={draft.code} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {form?.shortTitle ?? draft.code}
                      </p>
                      <p className="text-xs text-slate-500">
                        Saved {new Date(draft.savedAt).toLocaleString('en-US')}
                      </p>
                    </div>
                    {form ? (
                      <Link
                        href={fillPath(form)}
                        className="text-xs font-medium text-brand-700 underline"
                      >
                        Resume
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

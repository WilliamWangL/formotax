'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Trash2 } from 'lucide-react';
import { fillPath, listForms, toSummary } from '@tax/tax-form-engine';
import type { UserTaxFormDto } from '@tax/shared-types';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, ButtonLink } from '@/components/ui/button';
import { useSession } from '@/features/dashboard/session';
import { clearDraft, listDrafts, type DraftSummary } from '@/lib/draft';
import { fetchUserTaxForms } from '@/lib/api';

const forms = listForms();

export function FormsPanel() {
  const { apiReachable } = useSession();
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [records, setRecords] = useState<UserTaxFormDto[]>([]);

  useEffect(() => {
    setDrafts(listDrafts());
  }, []);

  useEffect(() => {
    if (!apiReachable) return;
    let active = true;
    fetchUserTaxForms()
      .then((page) => {
        if (active) setRecords(page.items);
      })
      .catch(() => {
        /* records are optional metadata; the local drafts stay usable */
      });
    return () => {
      active = false;
    };
  }, [apiReachable]);

  const removeDraft = (code: string) => {
    clearDraft(code);
    setDrafts(listDrafts());
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">My forms</h1>
        <p className="mt-1 text-sm text-slate-600">
          Drafts are saved in this browser only. Form answers and signatures are never uploaded.
        </p>
      </header>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Drafts in this browser</CardTitle>
          <Badge>{drafts.length}</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {drafts.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              Nothing saved yet. Open a form and your progress is stored automatically.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {drafts.map((draft) => {
                const form = forms.find((item) => item.code === draft.code);
                return (
                  <li key={draft.code} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {form?.title ?? draft.code}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Saved {new Date(draft.savedAt).toLocaleString('en-US')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDraft(draft.code)}
                        aria-label={`Delete draft for ${form?.shortTitle ?? draft.code}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        Delete
                      </Button>
                      {form ? (
                        <ButtonLink href={fillPath(form)} size="sm" variant="outline">
                          Resume
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </ButtonLink>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      {records.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Records saved to your account</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {records.map((record) => (
                <li key={record.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-ink">{record.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {record.formCode} · version {record.version} ·{' '}
                      {new Date(record.updatedAt).toLocaleDateString('en-US')}
                    </p>
                  </div>
                  <Badge>{record.status}</Badge>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Available forms</CardTitle>
        </CardHeader>
        <CardBody className="divide-y divide-slate-100 p-0">
          {forms.map((form) => {
            const summary = toSummary(form);
            return (
              <div key={form.code} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{summary.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Revision {form.pdf.revision} · {summary.audience}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/tax-forms/${form.slug}`}
                    className="text-xs font-medium text-slate-600 underline"
                  >
                    Guide
                  </Link>
                  <ButtonLink href={fillPath(form)} size="sm">
                    Start
                  </ButtonLink>
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}

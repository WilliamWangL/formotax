'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react';
import type { DownloadAccessDto, FormDefinition, FormValues } from '@tax/shared-types';
import { createFormZodSchema, isFieldVisible } from '@tax/validation';
import { defaultValues, pdfValues, pruneHiddenValues, validateForm } from '@tax/tax-form-engine';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FieldControl } from '@/features/filler/field-control';
import { PdfPreview } from '@/features/filler/pdf-preview';
import { SignatureField } from '@/features/filler/signature-field';
import { fetchDownloadAccess, fetchDownloadOrder, readTokens, startDownloadCheckout } from '@/lib/api';
import { readPass, savePass } from '@/lib/downloads';
import { clearDraft, loadDraft, saveDraft } from '@/lib/draft';
import { downloadOffer } from '@/lib/site';

type Stage = 'fill' | 'generating' | 'done';

function todayLabel(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

export function FormFiller({ definition }: { definition: FormDefinition }) {
  const router = useRouter();
  const schema = useMemo(() => createFormZodSchema(definition), [definition]);
  const {
    watch,
    setValue,
    setError,
    clearErrors,
    reset,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: defaultValues(definition),
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    mode: 'onTouched',
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [signature, setSignature] = useState('');
  const [stage, setStage] = useState<Stage>('fill');
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [draftAt, setDraftAt] = useState<string | null>(null);
  const [access, setAccess] = useState<DownloadAccessDto | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [price, setPrice] = useState(downloadOffer.price.toFixed(2));
  const [signedIn, setSignedIn] = useState(false);
  const pdfUrlRef = useRef<string | null>(null);
  const downloadRef = useRef<HTMLAnchorElement | null>(null);
  const pollRef = useRef<number | null>(null);

  const steps = definition.steps;
  const step = steps[stepIndex] ?? steps[0];
  const watched = watch();
  const visibleFields = step.fields.filter((field) => isFieldVisible(field, watched));
  const isLastStep = stepIndex === steps.length - 1;
  const unlocked = Boolean(access?.active);
  const returnPath = `/forms/${definition.code.toLowerCase()}/fill`;
  const fileBase = `${definition.code === 'W8BENE' ? 'W-8BEN-E' : definition.shortTitle.replace('Form ', '')}-${todayLabel()}`;

  useEffect(() => {
    const draft = loadDraft(definition.code);
    if (draft) {
      reset({ ...defaultValues(definition), ...draft.values });
      setDraftAt(draft.savedAt);
      setNotice('Draft restored from this device.');
    }
    // Draft restore intentionally runs once per form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition.code]);

  // Download access needs an account. The local pass keeps the unlocked state
  // visible while the API answers, or when it is temporarily unreachable.
  useEffect(() => {
    let active = true;
    const pass = readPass(definition.code);
    const tokens = readTokens();
    setSignedIn(Boolean(tokens));

    if (!tokens) {
      setAccessChecked(true);
      return;
    }

    fetchDownloadAccess(definition.code)
      .then((result) => {
        if (active) setAccess(result);
      })
      .catch(() => {
        if (active && pass) {
          setAccess({
            active: true,
            orderNo: pass.orderNo,
            paidAt: null,
            expiresAt: pass.expiresAt,
            price: downloadOffer.price.toFixed(2),
            currency: downloadOffer.currency,
            accessHours: downloadOffer.accessHours,
          });
        }
      })
      .finally(() => {
        if (active) setAccessChecked(true);
      });

    return () => {
      active = false;
    };
  }, [definition.code]);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveDraft(definition.code, getValues());
    }, 600);
    return () => window.clearTimeout(timer);
  }, [definition.code, getValues, watched]);

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    };
  }, []);

  const signatureField = step.fields.find((field) => field.type === 'signature');
  const isSignatureStep = step.kind === 'signature' || Boolean(signatureField);

  const setField = (name: string, value: string | boolean) => {
    setValue(name, value, { shouldValidate: true, shouldDirty: true });
    clearErrors(name);
  };

  const goToStep = (index: number) => {
    if (index < 0 || index >= steps.length) return;
    setStepIndex(index);
    setMaxVisited((current) => Math.max(current, index));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    const names = visibleFields.map((field) => field.name);
    const valid = await trigger(names, { shouldFocus: true });
    if (isSignatureStep && !signature) {
      setError('signature', { type: 'manual', message: 'Draw your signature in the box above.' });
      return false;
    }
    return valid;
  };

  const handleNext = async () => {
    setNotice(null);
    const valid = await validateCurrentStep();
    if (!valid) return;
    if (isLastStep) {
      await handleGenerate();
      return;
    }
    goToStep(stepIndex + 1);
  };

  const handleGenerate = async () => {
    setFailure(null);
    setNotice(null);

    const values = getValues();
    const result = validateForm(definition, values, {
      signatureCaptured: Boolean(signature),
      signatureRequired: true,
    });

    if (!result.valid) {
      for (const [field, message] of Object.entries(result.errors)) {
        setError(field, { type: 'manual', message });
      }
      const invalidIndex = steps.findIndex((item) => item.id === result.firstInvalidStepId);
      if (invalidIndex >= 0) goToStep(invalidIndex);
      setNotice('Some answers still need attention. Review the highlighted fields.');
      return;
    }

    setStage('generating');
    try {
      // pdf-lib is heavy, so it is only downloaded once a PDF is actually needed.
      const { dataUrlToBytes, generateTaxFormPdf } = await import('@tax/pdf-engine');
      const response = await fetch(definition.pdf.path, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Template download failed (${response.status}).`);
      const templateBytes = new Uint8Array(await response.arrayBuffer());
      const output = await generateTaxFormPdf({
        templateBytes,
        form: definition,
        values: pdfValues(definition, pruneHiddenValues(definition, values)),
        signatureBytes: signature ? dataUrlToBytes(signature) : undefined,
        flatten: true,
      });
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
      const bytes = new Uint8Array(output.bytes);
      const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' }));
      pdfUrlRef.current = url;
      setPdfUrl(url);
      setWarnings(output.warnings);
      setStage('done');
    } catch (error) {
      setStage('fill');
      setFailure(
        error instanceof Error
          ? `We could not create the PDF: ${error.message}`
          : 'We could not create the PDF. Please try again.',
      );
    }
  };

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  /** Waits for the provider to settle the order, then unlocks the download. */
  const watchOrder = useCallback(
    (orderNo: string) => {
      stopPolling();
      const startedAt = Date.now();
      pollRef.current = window.setInterval(async () => {
        if (Date.now() - startedAt > 10 * 60_000) {
          stopPolling();
          setPendingOrder(null);
          setPayError(
            'We have not received the payment confirmation yet. Reload this page in a minute — a paid order stays unlocked.',
          );
          return;
        }
        try {
          const order = await fetchDownloadOrder(orderNo);
          if (order.status === 'paid' && order.accessExpiresAt) {
            stopPolling();
            setPendingOrder(null);
            setCheckoutUrl(null);
            setAccess({
              active: true,
              orderNo: order.orderNo,
              paidAt: order.paidAt,
              expiresAt: order.accessExpiresAt,
              price: order.amount,
              currency: order.currency,
              accessHours: downloadOffer.accessHours,
            });
            savePass({
              formCode: definition.code,
              orderNo: order.orderNo,
              expiresAt: order.accessExpiresAt,
            });
            setNotice('Payment received — your download is unlocked.');
            window.setTimeout(() => downloadRef.current?.click(), 250);
          } else if (order.status === 'failed') {
            stopPolling();
            setPendingOrder(null);
            setPayError('The payment did not complete. You can try again.');
          }
        } catch {
          /* transient network error: keep polling */
        }
      }, 2500);
    },
    [definition.code, stopPolling],
  );

  const unlock = async () => {
    setPayError(null);
    setNotice(null);

    if (!readTokens()) {
      router.push(`/login?next=${encodeURIComponent(returnPath)}`);
      return;
    }

    try {
      const checkout = await startDownloadCheckout(definition.code);
      setPrice(checkout.amount);
      setPendingOrder(checkout.orderNo);
      const popup = window.open(checkout.checkoutUrl, 'formotax-checkout', 'width=520,height=760');
      if (!popup) setCheckoutUrl(checkout.checkoutUrl);
      watchOrder(checkout.orderNo);
    } catch (error) {
      setPayError(error instanceof Error ? error.message : 'Checkout is unavailable right now.');
    }
  };

  const startOver = () => {
    clearDraft(definition.code);
    reset(defaultValues(definition));
    setSignature('');
    setStepIndex(0);
    setMaxVisited(0);
    setStage('fill');
    setDraftAt(null);
    setNotice('Form cleared. Your saved draft was removed from this device.');
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }
    setPdfUrl(null);
    setWarnings([]);
  };

  if (stage === 'done' && pdfUrl) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-brand-700" aria-hidden />
            <div>
              <h1 className="text-xl font-semibold text-ink">Your {definition.shortTitle} is ready</h1>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                The official IRS PDF was filled in your browser with your answers and flattened for
                printing. Review page one below before you send it.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>PDF preview</CardTitle>
              <Badge tone="brand">{definition.pdf.revision}</Badge>
            </CardHeader>
            <CardBody>
              <PdfPreview url={pdfUrl} initialPage={(definition.pdf.signature?.page ?? 0) + 1} />
            </CardBody>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Download</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                {unlocked ? (
                  <>
                    <a
                      ref={downloadRef}
                      href={pdfUrl}
                      download={`${fileBase}.pdf`}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"
                    >
                      <Download className="h-4 w-4" aria-hidden />
                      Download PDF
                    </a>
                    <p className="text-xs leading-5 text-slate-500">
                      {access?.expiresAt
                        ? `Unlocked until ${new Date(access.expiresAt).toLocaleString('en-US')}. Re-download this form as often as you like in that window.`
                        : 'Download unlocked on this device.'}
                    </p>
                  </>
                ) : pendingOrder ? (
                  <>
                    <Button className="w-full" disabled>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Waiting for payment…
                    </Button>
                    {checkoutUrl ? (
                      <a
                        href={checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
                      >
                        Open the payment window
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    ) : (
                      <p className="text-xs leading-5 text-slate-500">
                        Complete the payment in the window that just opened. This page unlocks
                        automatically.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => void unlock()}
                      disabled={!accessChecked}
                    >
                      {accessChecked ? (
                        <>
                          <Download className="h-4 w-4" aria-hidden />
                          Download PDF · ${price}
                        </>
                      ) : (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          Checking access…
                        </>
                      )}
                    </Button>
                    <p className="text-xs leading-5 text-slate-500">
                      Filling and preview are free. Saving this PDF costs ${price} and unlocks
                      re-downloads for {downloadOffer.accessHours} hours.{' '}
                      {signedIn ? null : 'You will be asked to sign in first.'}
                    </p>
                  </>
                )}

                {payError ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs leading-5 text-red-700">
                    {payError}
                  </p>
                ) : null}

                <Button variant="outline" className="w-full" onClick={() => setStage('fill')}>
                  <RefreshCcw className="h-4 w-4" aria-hidden />
                  Edit answers
                </Button>
                <Button variant="ghost" className="w-full" onClick={startOver}>
                  Start a new form
                </Button>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Before you send it</CardTitle>
              </CardHeader>
              <CardBody>
                <ul className="space-y-2 text-xs leading-5 text-slate-600">
                  <li>Check that the name and TIN match the IRS records exactly.</li>
                  <li>Send the file only to the requester; do not mail it to the IRS.</li>
                  <li>Keep a copy for your own records if the payer asks for one.</li>
                </ul>
                {warnings.length ? (
                  <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                    {warnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                ) : null}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={definition.seo.landingPath} className="text-xs text-slate-500 hover:text-brand-700">
            ← {definition.shortTitle} overview
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            Fill {definition.shortTitle} online
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {definition.pdf.revision} · {definition.pdf.catalogNumber} · Estimated{' '}
            {definition.estimatedMinutes} minutes
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden />
          <span>
            {unlocked ? 'Download unlocked for this form' : `Free preview · $${price} per download`}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <ol className="flex flex-wrap gap-2" aria-label="Form steps">
            {steps.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => (index <= maxVisited ? goToStep(index) : undefined)}
                  disabled={index > maxVisited}
                  aria-current={index === stepIndex ? 'step' : undefined}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    index === stepIndex
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : index <= maxVisited
                        ? 'border-slate-300 bg-white text-slate-700 hover:border-brand-400'
                        : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  <span className="font-semibold">{index + 1}</span>
                  <span className="hidden sm:inline">{item.title.split(':')[0]}</span>
                </button>
              </li>
            ))}
          </ol>

          {notice ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>{notice}</p>
            </div>
          ) : null}

          {failure ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p>{failure}</p>
              <Link href="/pricing" className="mt-2 inline-block font-semibold underline">
                See pricing
              </Link>
            </div>
          ) : null}

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{step.title}</CardTitle>
              {step.subtitle ? (
                <p className="mt-1 text-sm leading-6 text-slate-600">{step.subtitle}</p>
              ) : null}
            </CardHeader>
            <CardBody>
              <div className="grid gap-5 sm:grid-cols-2">
                {visibleFields
                  .filter((field) => field.type !== 'signature')
                  .map((field) => (
                    <FieldControl
                      key={field.name}
                      field={field}
                      value={watched[field.name]}
                      error={errors[field.name]?.message as string | undefined}
                      onChange={(value) => setField(field.name, value)}
                      onBlur={() => void trigger(field.name)}
                    />
                  ))}

                {isSignatureStep ? (
                  <div className="sm:col-span-2">
                    <SignatureField
                      value={signature}
                      onChange={(value) => {
                        setSignature(value);
                        if (value) clearErrors('signature');
                      }}
                      label={
                        signatureField?.label ?? 'Signature'
                      }
                      error={errors.signature?.message as string | undefined}
                    />
                  </div>
                ) : null}
              </div>

              {isSignatureStep ? (
                <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  {definition.pdf.signature?.consentText ??
                    'By signing you certify that the information on this form is true, correct and complete.'}
                </p>
              ) : null}
            </CardBody>
          </Card>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => goToStep(stepIndex - 1)}
              disabled={stepIndex === 0}
            >
              Back
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                Step {stepIndex + 1} of {steps.length}
              </span>
              <Button type="button" onClick={handleNext} disabled={stage === 'generating'}>
                {stage === 'generating' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Building PDF
                  </>
                ) : isLastStep ? (
                  <>
                    <FileText className="h-4 w-4" aria-hidden />
                    Generate PDF
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Privacy</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-xs leading-5 text-slate-600">
                Your answers and signature stay in this browser tab. The PDF is assembled locally
                from the official template, so no tax data is uploaded.
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-brand-700">
                <Lock className="h-3.5 w-3.5" aria-hidden />
                On-device generation
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Draft</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-xs leading-5 text-slate-600">
                {draftAt
                  ? 'Answers are saved automatically in this device’s storage. Signatures are never saved.'
                  : 'Answers are saved automatically in this device’s storage once you type.'}
              </p>
              <Button variant="ghost" size="sm" className="mt-2 px-0" onClick={startOver}>
                Clear draft
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Need the instructions?</CardTitle>
            </CardHeader>
            <CardBody>
              <a
                href={definition.instructionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                Read the official IRS instructions
              </a>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                This tool is not affiliated with the IRS and does not provide tax advice.
              </p>
              <Link href="/pricing" className="mt-2 inline-block text-xs font-semibold text-brand-700 hover:underline">
                Pricing &amp; downloads
              </Link>
            </CardBody>
          </Card>
        </aside>
      </div>

      <p aria-live="polite" className="sr-only">
        {stage === 'generating' ? 'Generating your PDF' : ''}
      </p>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PdfDocument = Awaited<ReturnType<typeof loadPdf>>;

async function loadPdf(url: string) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  return pdfjs.getDocument({ url, isEvalSupported: false }).promise;
}

/**
 * Renders the generated PDF with PDF.js. The bytes come from a local blob URL,
 * so the document never travels to a server for previewing.
 */
export function PdfPreview({ url, initialPage = 1 }: { url: string; initialPage?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const docRef = useRef<PdfDocument | null>(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    loadPdf(url)
      .then((document) => {
        if (cancelled) {
          void document.destroy();
          return;
        }
        docRef.current = document;
        setPageCount(document.numPages);
        setPageNumber(Math.min(initialPage, document.numPages));
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Could not render the PDF.');
        }
      });

    return () => {
      cancelled = true;
      void docRef.current?.destroy();
      docRef.current = null;
    };
  }, [url, initialPage]);

  useEffect(() => {
    const document = docRef.current;
    const canvas = canvasRef.current;
    if (!document || !canvas || pageNumber < 1) return;

    let cancelled = false;
    setLoading(true);

    document
      .getPage(pageNumber)
      .then(async (page) => {
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const targetWidth = Math.min(canvas.parentElement?.clientWidth ?? base.width, 900);
        const scale = targetWidth / base.width;
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');
        if (!context) return;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        await page.render({ canvasContext: context, viewport }).promise;
        if (!cancelled) setLoading(false);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Could not render the page.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pageNumber, pageCount, url]);

  return (
    <div>
      <div className="relative flex min-h-[420px] items-start justify-center overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-3">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Rendering page {pageNumber}
          </div>
        ) : null}
        {error ? (
          <p className="p-6 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : (
          <canvas ref={canvasRef} className="max-w-full rounded shadow-sm" aria-label="PDF preview" />
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
        <span>
          Page {pageNumber} of {pageCount || '…'}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPageNumber((value) => Math.max(1, value - 1))}
            disabled={pageNumber <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPageNumber((value) => Math.min(pageCount, value + 1))}
            disabled={pageNumber >= pageCount}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import SignaturePad from 'signature_pad';
import { useEffect, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SignatureField({
  value,
  onChange,
  label,
  error,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  label: string;
  error?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [dirty, setDirty] = useState(Boolean(value));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pad = new SignaturePad(canvas, {
      penColor: '#12203a',
      minWidth: 0.7,
      maxWidth: 2.4,
      backgroundColor: 'rgba(255,255,255,0)',
    });
    padRef.current = pad;

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const { width, height } = canvas.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.getContext('2d')?.scale(ratio, ratio);
      pad.clear();
      setDirty(false);
      onChange('');
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const handleEnd = () => {
      if (pad.isEmpty()) {
        setDirty(false);
        onChange('');
        return;
      }
      setDirty(true);
      onChange(pad.toDataURL('image/png'));
    };
    pad.addEventListener('endStroke', handleEnd);

    return () => {
      pad.removeEventListener('endStroke', handleEnd);
      observer.disconnect();
      pad.off();
      padRef.current = null;
    };
    // The pad is mounted once per form; parent callbacks are stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clear = () => {
    padRef.current?.clear();
    setDirty(false);
    onChange('');
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-800">
          {label}
          <span className="ml-0.5 text-red-600">*</span>
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={!dirty && !value}>
          <Eraser className="h-3.5 w-3.5" aria-hidden />
          Clear
        </Button>
      </div>
      <div
        className={`relative rounded-lg border-2 border-dashed bg-white ${
          error ? 'border-red-400' : dirty || value ? 'border-brand-300' : 'border-slate-300'
        }`}
      >
        <canvas
          ref={canvasRef}
          className="h-40 w-full touch-none rounded-lg"
          aria-label="Signature drawing area"
        />
        {!dirty && !value ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm text-slate-400">
            <PenLine className="h-4 w-4" aria-hidden />
            Sign with your finger, stylus or mouse
          </span>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-slate-500">
          The image is placed on the official signature line. Nothing is uploaded.
        </p>
      )}
    </div>
  );
}

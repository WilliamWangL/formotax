import { Suspense } from 'react';
import { buildMetadata } from '@/lib/metadata';
import { DownloadReturn } from '@/features/downloads/download-return';

export const metadata = buildMetadata({
  title: 'Confirming your download',
  description: 'Confirmation page for a paid tax form download.',
  path: '/downloads/return',
  noIndex: true,
});

export default function DownloadReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-20 text-center text-sm text-slate-500">
          Confirming your payment…
        </div>
      }
    >
      <DownloadReturn />
    </Suspense>
  );
}

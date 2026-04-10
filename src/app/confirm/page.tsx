import { Suspense } from 'react';
import ConfirmContent from './confirm-content';

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50">
          <p className="text-gray-500">Chargement...</p>
        </main>
      }
    >
      <ConfirmContent />
    </Suspense>
  );
}

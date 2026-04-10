import { Suspense } from 'react';
import SignalerContent from './signaler-content';

export default function SignalerPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50">
          <p className="text-gray-500">Chargement...</p>
        </main>
      }
    >
      <SignalerContent />
    </Suspense>
  );
}

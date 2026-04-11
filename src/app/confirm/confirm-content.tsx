'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

type ConfirmType = 'invite' | 'recovery' | 'signup' | 'email';

const TITLES: Record<ConfirmType, string> = {
  invite: 'Vous avez été invité',
  recovery: 'Réinitialisation du mot de passe',
  signup: 'Confirmation de votre compte',
  email: 'Confirmation de votre email',
};

const DESCRIPTIONS: Record<ConfirmType, string> = {
  invite: 'Cliquez ci-dessous pour accepter l\'invitation et créer votre mot de passe.',
  recovery: 'Cliquez ci-dessous pour réinitialiser votre mot de passe.',
  signup: 'Cliquez ci-dessous pour confirmer votre compte.',
  email: 'Cliquez ci-dessous pour confirmer votre adresse email.',
};

const BUTTON_LABELS: Record<ConfirmType, string> = {
  invite: 'Accepter l\'invitation',
  recovery: 'Réinitialiser mon mot de passe',
  signup: 'Confirmer mon compte',
  email: 'Confirmer mon email',
};

export default function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const tokenHash = searchParams.get('token_hash') ?? '';
  const type = (searchParams.get('type') ?? 'invite') as ConfirmType;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!tokenHash) {
      setError('Lien invalide : token manquant.');
      return;
    }
    setLoading(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type === 'recovery' ? 'recovery' : type === 'signup' ? 'signup' : 'invite',
    });

    if (verifyError) {
      setLoading(false);
      if (verifyError.message.includes('expired') || verifyError.message.includes('invalid')) {
        setError('Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.');
      } else {
        setError(verifyError.message);
      }
      return;
    }

    // Rediriger vers /welcome pour définir le mot de passe
    window.location.href = '/welcome';
  }

  if (!tokenHash) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm border border-red-200 text-center space-y-4">
          <h1 className="text-xl font-bold text-red-700">Lien invalide</h1>
          <p className="text-sm text-gray-600">Ce lien est incomplet ou corrompu.</p>
          <button
            onClick={() => { window.location.href = '/login'; }}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Aller à la connexion
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm border border-gray-200 text-center space-y-6">
        <Image
          src="/logo-notifeo.png"
          alt="Notifeo"
          width={1000}
          height={400}
          priority
          className="h-14 w-auto mx-auto"
        />

        <div>
          <h1 className="text-xl font-bold text-gray-900">{TITLES[type]}</h1>
          <p className="text-sm text-gray-500 mt-2">{DESCRIPTIONS[type]}</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 text-left">
            {error}
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Vérification...' : BUTTON_LABELS[type]}
        </button>

        <p className="text-xs text-gray-400">
          Ce bouton est à usage unique. Si vous avez déjà cliqué, ce lien ne fonctionnera plus.
        </p>
      </div>
    </main>
  );
}

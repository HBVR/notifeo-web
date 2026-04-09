'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function WelcomePage() {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1. Check the URL hash for tokens (implicit flow from invite/signup)
        if (typeof window !== 'undefined') {
          const hash = window.location.hash.startsWith('#')
            ? window.location.hash.slice(1)
            : '';
          if (hash) {
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (error) throw error;
              // Clean up the URL hash after successful session set
              window.history.replaceState(
                null,
                '',
                window.location.pathname + window.location.search
              );
            }
          }
        }

        // 2. Now read the user from the established session
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          if (!cancelled) router.replace('/login');
          return;
        }

        if (!cancelled) {
          setEmail(user.email ?? null);
          setChecking(false);
        }
      } catch (e) {
        if (!cancelled) {
          // Nettoyer le hash pour éviter la boucle de redirection
          if (typeof window !== 'undefined') {
            window.history.replaceState(
              null,
              '',
              window.location.pathname + window.location.search
            );
          }
          setInitError(e instanceof Error ? e.message : String(e));
          setChecking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/');
    router.refresh();
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Chargement...</p>
      </main>
    );
  }

  if (initError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-sm border border-red-200">
          <h1 className="text-xl font-bold text-red-700">Erreur d&apos;invitation</h1>
          <p className="text-sm text-gray-700">{initError}</p>
          <p className="text-xs text-gray-500">
            Le lien est peut-être expiré ou déjà utilisé. Demande à ton manager une
            nouvelle invitation.
          </p>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/login';
              }
            }}
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
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-sm border border-gray-200"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenue 👋</h1>
          <p className="text-sm text-gray-500 mt-1">
            Choisissez un mot de passe pour {email}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nouveau mot de passe
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmer
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Enregistrement...' : 'Valider'}
        </button>
      </form>
    </main>
  );
}

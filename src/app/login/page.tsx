'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      router.push('/');
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || undefined,
            organization_name: orgName || undefined,
          },
        },
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      // Si email confirmation désactivée, on a une session tout de suite
      if (data.session) {
        router.push('/');
        router.refresh();
      } else {
        setInfo(
          'Inscription réussie. Vérifie ta boîte mail pour confirmer ton compte.'
        );
      }
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-sm border border-gray-200"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incident App</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'signin' ? 'Connexion manager' : 'Créer une organisation'}
          </p>
        </div>

        {mode === 'signup' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de votre entreprise
              </label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Corp"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mot de passe
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {info && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
            {info}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading
            ? mode === 'signin'
              ? 'Connexion...'
              : 'Création...'
            : mode === 'signin'
            ? 'Se connecter'
            : 'Créer mon compte'}
        </button>

        <div className="text-center text-sm text-gray-600">
          {mode === 'signin' ? (
            <>
              Pas encore de compte ?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setInfo(null);
                }}
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Créer une organisation
              </button>
            </>
          ) : (
            <>
              Déjà un compte ?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setInfo(null);
                }}
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Se connecter
              </button>
            </>
          )}
        </div>
      </form>
    </main>
  );
}

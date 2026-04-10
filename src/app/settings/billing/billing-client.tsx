'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Usage } from '@/lib/plan-limits';

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: '0€',
    period: '/mois',
    features: ['1 site', '5 utilisateurs', '50 notifs/mois', 'Photos + annotations'],
    cta: 'Plan actuel',
    popular: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '49€',
    period: '/mois',
    features: [
      'Sites illimités',
      'Utilisateurs illimités',
      'Notifs illimitées',
      'Analytics + export CSV',
      'Support prioritaire',
    ],
    cta: 'Passer en Pro',
    popular: true,
  },
  {
    key: 'business',
    name: 'Business',
    price: '99€',
    period: '/mois',
    features: [
      'Tout Pro inclus',
      'SSO (Single Sign-On)',
      "API d'intégration",
      'SLA garanti',
      'Account manager dédié',
    ],
    cta: 'Nous contacter',
    popular: false,
  },
];

export default function BillingClient({
  usage,
  hasSubscription,
  proPriceId,
  businessPriceId,
}: {
  usage: Usage;
  hasSubscription: boolean;
  proPriceId: string;
  businessPriceId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function subscribe(priceId: string, planKey: string) {
    if (!priceId) {
      alert('Configuration Stripe incomplète. Contactez le support.');
      return;
    }
    setLoading(planKey);
    const resp = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    });
    const { url, error } = await resp.json();
    if (error) {
      alert(error);
      setLoading(null);
      return;
    }
    window.location.href = url;
  }

  async function openPortal() {
    setLoading('portal');
    const resp = await fetch('/api/stripe/portal', { method: 'POST' });
    const { url, error } = await resp.json();
    if (error) {
      alert(error);
      setLoading(null);
      return;
    }
    window.location.href = url;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Image
              src="/logo-notifeo.png"
              alt="Notifeo"
              width={1000}
              height={400}
              priority
              className="h-12 w-auto"
            />
          </div>
          <Link href="/" className="text-sm font-medium text-blue-600">
            ← Retour au dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Abonnement</h1>
        <p className="mt-2 text-gray-600">
          Gérez votre plan et votre facturation.
        </p>

        {/* Usage actuel */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Usage actuel
          </h2>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{usage.sites}</p>
              <p className="text-sm text-gray-500">
                sites {usage.limits.max_sites !== -1 && `/ ${usage.limits.max_sites}`}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{usage.users}</p>
              <p className="text-sm text-gray-500">
                membres {usage.limits.max_users !== -1 && `/ ${usage.limits.max_users}`}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{usage.notifsThisMonth}</p>
              <p className="text-sm text-gray-500">
                notifs ce mois {usage.limits.max_notifs_month !== -1 && `/ ${usage.limits.max_notifs_month}`}
              </p>
            </div>
          </div>
        </div>

        {/* Gestion abonnement existant */}
        {hasSubscription && (
          <div className="mt-6">
            <button
              onClick={openPortal}
              disabled={loading === 'portal'}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {loading === 'portal' ? 'Chargement...' : 'Gérer mon abonnement (factures, carte, annuler)'}
            </button>
          </div>
        )}

        {/* Plans */}
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((p) => {
            const isCurrent = usage.plan === p.key;
            const priceId = p.key === 'pro' ? proPriceId : p.key === 'business' ? businessPriceId : '';

            return (
              <div
                key={p.key}
                className={`rounded-2xl bg-white p-6 shadow-sm ${
                  p.popular
                    ? 'border-2 border-blue-600 relative'
                    : 'border border-gray-200'
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-bold text-white">
                    Populaire
                  </div>
                )}
                <h3 className="text-lg font-bold text-gray-900">{p.name}</h3>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-gray-900">{p.price}</span>
                  <span className="text-gray-500">{p.period}</span>
                </div>
                <ul className="mt-5 space-y-2 text-sm text-gray-600">
                  {p.features.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="mt-6 w-full rounded-lg bg-gray-100 py-2.5 text-center text-sm font-semibold text-gray-500">
                    Plan actuel
                  </div>
                ) : p.key === 'business' ? (
                  <a
                    href="mailto:contact@notifeo.fr?subject=Notifeo Business"
                    className="mt-6 block w-full rounded-lg border border-gray-300 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Nous contacter
                  </a>
                ) : p.key === 'starter' ? null : (
                  <button
                    onClick={() => subscribe(priceId, p.key)}
                    disabled={!!loading}
                    className="mt-6 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading === p.key ? 'Redirection...' : p.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

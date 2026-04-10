'use client';

import type { Usage } from '@/lib/plan-limits';

function ProgressBar({ used, max, label }: { used: number; max: number; label: string }) {
  const unlimited = max === -1;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / max) * 100));
  const isNear = !unlimited && pct >= 80;
  const isFull = !unlimited && pct >= 100;

  return (
    <div className="flex-1 min-w-[140px]">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className={`text-xs font-semibold ${isFull ? 'text-red-600' : isNear ? 'text-amber-600' : 'text-gray-500'}`}>
          {used}{unlimited ? '' : ` / ${max}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isFull ? 'bg-red-500' : isNear ? 'bg-amber-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {unlimited && (
        <div className="h-1.5 rounded-full bg-blue-100">
          <div className="h-full rounded-full bg-blue-400 w-0" />
        </div>
      )}
    </div>
  );
}

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter (gratuit)',
  pro: 'Pro',
  business: 'Business',
};

export default function UsageBar({ usage }: { usage: Usage }) {
  const isStarter = usage.plan === 'starter';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            isStarter ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-800'
          }`}>
            {PLAN_LABELS[usage.plan] ?? usage.plan}
          </span>
        </div>

        <ProgressBar used={usage.sites} max={usage.limits.max_sites} label="Sites" />
        <ProgressBar used={usage.users} max={usage.limits.max_users} label="Membres" />
        <ProgressBar used={usage.notifsThisMonth} max={usage.limits.max_notifs_month} label="Notifs ce mois" />

        {isStarter && (
          <a
            href="/settings/billing"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
          >
            Passer en Pro
          </a>
        )}
      </div>
    </div>
  );
}

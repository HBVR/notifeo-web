'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Member = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'employee' | 'manager' | 'admin';
  created_at: string;
};

const ROLE_LABELS: Record<Member['role'], string> = {
  employee: 'Employé',
  manager: 'Manager',
  admin: 'Admin',
};

const ROLE_STYLES: Record<Member['role'], string> = {
  employee: 'bg-gray-100 text-gray-700',
  manager: 'bg-blue-100 text-blue-800',
  admin: 'bg-purple-100 text-purple-800',
};

export default function TeamManager({
  initialMembers,
  canInvite,
  currentUserId,
}: {
  initialMembers: Member[];
  canInvite: boolean;
  currentUserId: string;
}) {
  const supabase = createClient();
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'employee' | 'manager'>('employee');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    setInfo(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError('Session expirée, reconnecte-toi.');
      setSubmitting(false);
      return;
    }

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke(
        'invite-user',
        {
          body: { email: email.trim(), role },
        }
      );

      if (fnError) {
        let msg = fnError.message || 'Erreur lors de l’invitation';
        const ctx = (fnError as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.text === 'function') {
          try {
            const txt = await ctx.text();
            if (txt) msg = txt;
          } catch {}
        }
        setError(msg);
        setSubmitting(false);
        return;
      }
      if (result && typeof result === 'object' && 'error' in result) {
        setError((result as { error: string }).error);
        setSubmitting(false);
        return;
      }

      setInfo(`Invitation envoyée à ${email.trim()}.`);
      setEmail('');

      // Rafraîchir la liste
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at')
        .order('created_at', { ascending: true });
      if (data) setMembers(data as Member[]);
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {canInvite && (
        <form
          onSubmit={invite}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Inviter un membre
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_auto]">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@entreprise.com"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'employee' | 'manager')}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="employee">Employé</option>
              <option value="manager">Manager</option>
            </select>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Envoi...' : 'Inviter'}
            </button>
          </div>
          {error && (
            <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {info && (
            <div className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              {info}
            </div>
          )}
        </form>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Rôle
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {m.full_name || <span className="text-gray-400">—</span>}
                  {m.id === currentUserId && (
                    <span className="ml-2 text-xs text-gray-400">(vous)</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{m.email}</td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_STYLES[m.role]}`}
                  >
                    {ROLE_LABELS[m.role]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

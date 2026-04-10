import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import TeamManager from './team-manager';
import SignOutButton from '../sign-out-button';
import { getUsage, type PlanName } from '@/lib/plan-limits';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id, organizations(name, plan)')
    .eq('id', user!.id)
    .single();

  const org = profile?.organizations as unknown as { name: string; plan: string } | null;
  const plan = (org?.plan ?? 'starter') as PlanName;
  const usage = await getUsage(supabase, profile?.organization_id ?? '', plan);

  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .order('created_at', { ascending: true });

  const orgName = org?.name ?? 'Organisation';
  const canInvite = profile?.role === 'manager' || profile?.role === 'admin';

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
            <div className="hidden sm:flex items-center gap-2 border-l border-gray-200 pl-4">
              <span className="text-sm font-semibold text-gray-900">{orgName}</span>
              <span className="text-xs text-gray-400">{user?.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <nav className="flex gap-4 text-sm font-medium">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Notifs
              </Link>
              <Link href="/sites" className="text-gray-600 hover:text-gray-900">
                Sites
              </Link>
              <Link href="/team" className="text-blue-600">
                Équipe
              </Link>
            </nav>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Équipe</h2>
          <p className="text-sm text-gray-500 mt-1">
            Invitez les membres de votre organisation. Ils recevront un email pour
            créer leur mot de passe.
          </p>
        </div>
        <TeamManager
          initialMembers={members ?? []}
          canInvite={canInvite}
          currentUserId={user!.id}
          canInviteByPlan={usage.canInviteUser}
        />
      </div>
    </main>
  );
}

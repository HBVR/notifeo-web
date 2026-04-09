import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import TeamManager from './team-manager';
import SignOutButton from '../sign-out-button';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id, organizations(name)')
    .eq('id', user!.id)
    .single();

  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .order('created_at', { ascending: true });

  const orgName =
    (profile?.organizations as unknown as { name: string } | null)?.name ??
    'Organisation';
  const canInvite = profile?.role === 'manager' || profile?.role === 'admin';

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Incident App</h1>
            <p className="text-sm text-gray-500">
              {orgName} · {user?.email}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <nav className="flex gap-4 text-sm font-medium">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Incidents
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
        />
      </div>
    </main>
  );
}

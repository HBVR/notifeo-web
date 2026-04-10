import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import NotifsList from './incidents-list';
import SignOutButton from './sign-out-button';
import UsageBar from './usage-bar';
import Landing from './landing';
import { getUsage, type PlanName } from '@/lib/plan-limits';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pas connecté → landing page marketing
  if (!user) {
    return <Landing />;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, organization_id, organizations(name, plan)')
    .eq('id', user!.id)
    .single();

  const org = profile?.organizations as unknown as { name: string; plan: string } | null;
  const orgId = profile?.organization_id ?? '';
  const plan = (org?.plan ?? 'starter') as PlanName;
  const usage = await getUsage(supabase, orgId, plan);

  const { data: incidents } = await supabase
    .from('incidents')
    .select(
      'id, title, description, severity, status, created_at, photo_url, annotated_photo_url, free_location, reporter_id, sites(name, address), reporter:profiles!incidents_reporter_id_fkey(full_name,email)'
    )
    .order('created_at', { ascending: false });

  const { data: allSites } = await supabase
    .from('sites')
    .select('id, name, archived_at')
    .order('name');

  const activeSites = (allSites ?? []).filter((s) => !s.archived_at);
  const archivedSiteNames = (allSites ?? [])
    .filter((s) => s.archived_at)
    .map((s) => s.name);

  const orgName = org?.name ?? 'Organisation';

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
              <Link href="/" className="text-blue-600">
                Notifs
              </Link>
              <Link href="/sites" className="text-gray-600 hover:text-gray-900">
                Sites
              </Link>
              <Link href="/team" className="text-gray-600 hover:text-gray-900">
                Équipe
              </Link>
            </nav>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <UsageBar usage={usage} />
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Notifs</h2>
          <Link
            href="/signaler"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Nouvelle notif
          </Link>
          <span className="text-sm text-gray-500">{incidents?.length ?? 0} total</span>
        </div>
        <NotifsList
          initialNotifs={(incidents as unknown as import('./incidents-list').Incident[]) ?? []}
          sites={activeSites as { id: string; name: string }[]}
          archivedSiteNames={archivedSiteNames}
          currentUserId={user!.id}
          currentUserRole={profile?.role as string ?? 'employee'}
        />
      </div>
    </main>
  );
}

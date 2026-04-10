import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import NotifsList from './incidents-list';
import DashboardShell from './dashboard-shell';
import Landing from './landing';
import { getUsage, type PlanName } from '@/lib/plan-limits';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <Landing />;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, organization_id, organizations(name, plan)')
    .eq('id', user!.id)
    .single();

  const org = profile?.organizations as unknown as { name: string; plan: string } | null;
  const plan = (org?.plan ?? 'starter') as PlanName;
  const usage = await getUsage(supabase, profile?.organization_id ?? '', plan);

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
  const archivedSiteNames = (allSites ?? []).filter((s) => s.archived_at).map((s) => s.name);

  return (
    <DashboardShell
      orgName={org?.name ?? 'Organisation'}
      email={user.email ?? ''}
      usage={usage}
      activeTab="notifs"
    >
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
        currentUserRole={(profile?.role as string) ?? 'employee'}
      />
    </DashboardShell>
  );
}

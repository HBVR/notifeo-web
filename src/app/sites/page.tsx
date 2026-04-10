import { createClient } from '@/lib/supabase/server';
import SitesManager from './sites-manager';
import DashboardShell from '../dashboard-shell';
import { getUsage, type PlanName } from '@/lib/plan-limits';

export const dynamic = 'force-dynamic';

export default async function SitesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role, organizations(name, plan)')
    .eq('id', user!.id)
    .single();

  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, address, qr_token, created_at, archived_at, created_by')
    .order('archived_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false });

  const org = profile?.organizations as unknown as { name: string; plan: string } | null;
  const plan = (org?.plan ?? 'starter') as PlanName;
  const usage = await getUsage(supabase, profile?.organization_id ?? '', plan);

  return (
    <DashboardShell
      orgName={org?.name ?? 'Organisation'}
      email={user?.email ?? ''}
      usage={usage}
      activeTab="sites"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Sites</h2>
        <p className="text-sm text-gray-500 mt-1">
          Créez un site puis téléchargez le QR code à imprimer et afficher sur place.
        </p>
      </div>
      <SitesManager
        initialSites={sites ?? []}
        organizationId={profile?.organization_id ?? null}
        currentUserId={user!.id}
        currentUserRole={(profile?.role as string) ?? 'employee'}
        canCreateSite={usage.canCreateSite}
      />
    </DashboardShell>
  );
}

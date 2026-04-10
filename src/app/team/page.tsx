import { createClient } from '@/lib/supabase/server';
import TeamManager from './team-manager';
import DashboardShell from '../dashboard-shell';
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

  const canInvite = profile?.role === 'manager' || profile?.role === 'admin';

  return (
    <DashboardShell
      orgName={org?.name ?? 'Organisation'}
      email={user?.email ?? ''}
      usage={usage}
      activeTab="team"
    >
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
    </DashboardShell>
  );
}

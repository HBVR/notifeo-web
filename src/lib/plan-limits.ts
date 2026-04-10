import { SupabaseClient } from '@supabase/supabase-js';

export type PlanName = 'starter' | 'pro' | 'business';

export const PLAN_LIMITS: Record<PlanName, { max_sites: number; max_users: number; max_notifs_month: number }> = {
  starter: { max_sites: 1, max_users: 5, max_notifs_month: 50 },
  pro: { max_sites: -1, max_users: -1, max_notifs_month: -1 },
  business: { max_sites: -1, max_users: -1, max_notifs_month: -1 },
};

export type Usage = {
  plan: PlanName;
  sites: number;
  users: number;
  notifsThisMonth: number;
  limits: typeof PLAN_LIMITS.starter;
  canCreateSite: boolean;
  canInviteUser: boolean;
  canCreateNotif: boolean;
};

export async function getUsage(
  supabase: SupabaseClient,
  orgId: string,
  plan: PlanName
): Promise<Usage> {
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;

  // Count active sites
  const { count: sitesCount } = await supabase
    .from('sites')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .is('archived_at', null);

  // Count users in org
  const { count: usersCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  // Count notifs this month (from all sites in org)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: notifsCount } = await supabase
    .from('incidents')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString());

  const sites = sitesCount ?? 0;
  const users = usersCount ?? 0;
  const notifsThisMonth = notifsCount ?? 0;

  return {
    plan,
    sites,
    users,
    notifsThisMonth,
    limits,
    canCreateSite: limits.max_sites === -1 || sites < limits.max_sites,
    canInviteUser: limits.max_users === -1 || users < limits.max_users,
    canCreateNotif: limits.max_notifs_month === -1 || notifsThisMonth < limits.max_notifs_month,
  };
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUsage, type PlanName } from '@/lib/plan-limits';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, organizations(plan)')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'no org' }, { status: 400 });
  }

  const org = profile.organizations as unknown as { plan: string } | null;
  const plan = (org?.plan ?? 'starter') as PlanName;
  const usage = await getUsage(supabase, profile.organization_id, plan);

  return NextResponse.json(usage);
}

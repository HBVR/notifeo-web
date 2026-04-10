import { createClient } from '@/lib/supabase/server';
import { getUsage, type PlanName } from '@/lib/plan-limits';
import BillingClient from './billing-client';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role, organizations(name, plan, stripe_customer_id, stripe_subscription_id)')
    .eq('id', user.id)
    .single();

  const org = profile?.organizations as unknown as {
    name: string;
    plan: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
  } | null;

  const plan = (org?.plan ?? 'starter') as PlanName;
  const usage = await getUsage(supabase, profile?.organization_id ?? '', plan);

  return (
    <BillingClient
      usage={usage}
      hasSubscription={!!org?.stripe_subscription_id}
      proPriceId={process.env.STRIPE_PRO_PRICE_ID ?? ''}
      businessPriceId={process.env.STRIPE_BUSINESS_PRICE_ID ?? ''}
    />
  );
}

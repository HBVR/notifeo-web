import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-03-25.dahlia',
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organizations(stripe_customer_id)')
    .eq('id', user.id)
    .single();

  const org = profile?.organizations as unknown as { stripe_customer_id: string | null } | null;
  if (!org?.stripe_customer_id) {
    return NextResponse.json({ error: 'no subscription' }, { status: 400 });
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${new URL(request.url).origin}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}

import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-03-25.dahlia',
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, organizations(name, stripe_customer_id)')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'no org' }, { status: 400 });
  }

  const org = profile.organizations as unknown as {
    name: string;
    stripe_customer_id: string | null;
  } | null;

  const { priceId } = await request.json();
  if (!priceId) {
    return NextResponse.json({ error: 'priceId required' }, { status: 400 });
  }

  // Créer ou récupérer le customer Stripe
  let customerId = org?.stripe_customer_id;
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      name: org?.name ?? undefined,
      metadata: { org_id: profile.organization_id },
    });
    customerId = customer.id;
    await supabase
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', profile.organization_id);
  }

  // Créer la session Checkout
  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${request.nextUrl.origin}/settings/billing?success=true`,
    cancel_url: `${request.nextUrl.origin}/settings/billing?canceled=true`,
    metadata: { org_id: profile.organization_id },
  });

  return NextResponse.json({ url: session.url });
}

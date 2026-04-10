import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-03-25.dahlia',
  });
}

const getWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET!;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, getWebhookSecret());
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.org_id;
      if (orgId && session.subscription) {
        await getSupabaseAdmin()
          .from('organizations')
          .update({
            plan: 'pro',
            stripe_subscription_id: session.subscription as string,
          })
          .eq('id', orgId);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const { data: org } = await getSupabaseAdmin()
        .from('organizations')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();
      if (org) {
        const plan = sub.status === 'active' ? 'pro' : 'starter';
        await getSupabaseAdmin()
          .from('organizations')
          .update({ plan, stripe_subscription_id: sub.id })
          .eq('id', org.id);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      await getSupabaseAdmin()
        .from('organizations')
        .update({ plan: 'starter', stripe_subscription_id: null })
        .eq('stripe_customer_id', customerId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

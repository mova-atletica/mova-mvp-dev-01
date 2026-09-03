import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { getStripe } from "../../../../lib/stripe";
import {
  applyStripeEntitlement,
  PROFILE_BILLING_SELECT,
  type ProfileBillingRow,
} from "../../../../lib/billing/entitlements";

export const runtime = "nodejs";

async function setProFromSubscription(
  subscription: Stripe.Subscription,
  fallbackUserId?: string | null
) {
  const admin = createAdminClient();
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const userId =
    subscription.metadata?.supabase_user_id ||
    fallbackUserId ||
    null;
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const status = subscription.status;
  const isActive = status === "active" || status === "trialing";

  let profileQuery = admin.from("profiles").select(PROFILE_BILLING_SELECT).limit(1);
  if (userId) {
    profileQuery = profileQuery.eq("id", userId);
  } else {
    profileQuery = profileQuery.eq("stripe_customer_id", customerId);
  }

  const { data: profile, error } = await profileQuery.maybeSingle();
  if (error || !profile) {
    console.error("Webhook: profile not found", { customerId, userId, error });
    return;
  }

  await applyStripeEntitlement(admin, profile as ProfileBillingRow, {
    stripeActive: isActive,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
  });
}

async function clearSubscription(customerId: string, subscriptionId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select(PROFILE_BILLING_SELECT)
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!profile) return;
  if (profile.stripe_subscription_id && profile.stripe_subscription_id !== subscriptionId) {
    return;
  }

  await applyStripeEntitlement(admin, profile as ProfileBillingRow, {
    stripeActive: false,
    stripeCustomerId: customerId,
    stripeSubscriptionId: null,
    stripePriceId: null,
  });
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const userId = session.metadata?.supabase_user_id || session.client_reference_id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (!subscriptionId) break;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await setProFromSubscription(subscription, userId);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await setProFromSubscription(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        await clearSubscription(customerId, subscription.id);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

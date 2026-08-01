import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { getStripe } from "../../../../lib/stripe";

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

  let profileQuery = admin.from("profiles").select("id, tier").limit(1);
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

  if (profile.tier === "partner") {
    // Keep partner; still store Stripe ids for Portal.
    await admin
      .from("profiles")
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
      })
      .eq("id", profile.id);
    return;
  }

  await admin
    .from("profiles")
    .update({
      tier: isActive ? "pro" : "free",
      stripe_customer_id: customerId,
      stripe_subscription_id: isActive ? subscription.id : null,
      stripe_price_id: isActive ? priceId : null,
    })
    .eq("id", profile.id);
}

async function clearSubscription(customerId: string, subscriptionId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, tier")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!profile) return;
  if (profile.tier === "partner") {
    await admin
      .from("profiles")
      .update({
        stripe_subscription_id: null,
        stripe_price_id: null,
      })
      .eq("id", profile.id);
    return;
  }

  await admin
    .from("profiles")
    .update({
      tier: "free",
      stripe_subscription_id: null,
      stripe_price_id: null,
    })
    .eq("id", profile.id)
    .eq("stripe_subscription_id", subscriptionId);
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

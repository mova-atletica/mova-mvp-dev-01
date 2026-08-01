import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { getProPriceId, getStripe, siteUrl, type ProPriceKey } from "../../../../lib/stripe";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { priceKey?: string };
    const priceKey: ProPriceKey = body.priceKey === "yearly" ? "yearly" : "monthly";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, tier, stripe_customer_id, display_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.tier === "partner") {
      return NextResponse.json({ error: "Partner accounts already include Pro" }, { status: 400 });
    }

    const stripe = getStripe();
    const admin = createAdminClient();
    let customerId = profile.stripe_customer_id as string | null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: profile.display_name || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      const { error: updateError } = await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
      if (updateError) {
        console.error("Failed to save stripe_customer_id", updateError);
        return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
      }
    }

    const priceId = getProPriceId(priceKey);
    const base = siteUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/?pro=success`,
      cancel_url: `${base}/?pro=cancel`,
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id, price_key: priceKey },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Checkout session missing URL" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error", error);
    const message = error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

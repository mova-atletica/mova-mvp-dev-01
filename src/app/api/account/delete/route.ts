import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "../../../../lib/stripe";
import { wipeUserStorage } from "../../../../lib/storage/userStorageWipe";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { getAuthenticatedUser } from "../../../../lib/supabase/routeAuth";

function isStripeCancelSkippable(err: unknown): boolean {
  if (!(err instanceof Stripe.errors.StripeError)) {
    return false;
  }
  if (err.code === "resource_missing") {
    return true;
  }
  const message = err.message.toLowerCase();
  return message.includes("canceled") || message.includes("cancelled");
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const userId = auth.user.id;
    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Account delete: profile load failed", profileError);
      return NextResponse.json({ error: "Could not load profile" }, { status: 500 });
    }

    const subscriptionId = profile?.stripe_subscription_id as string | null | undefined;
    if (subscriptionId) {
      const stripe = getStripe();
      try {
        await stripe.subscriptions.cancel(subscriptionId);
      } catch (err) {
        if (!isStripeCancelSkippable(err)) {
          console.error("Account delete: Stripe cancel failed", err);
          const message = err instanceof Error ? err.message : "Could not cancel subscription";
          return NextResponse.json({ error: message }, { status: 500 });
        }
      }
    }

    try {
      await wipeUserStorage(admin, userId);
    } catch (err) {
      console.error("Account delete: storage wipe failed", err);
      const message = err instanceof Error ? err.message : "Could not delete storage";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Account delete: auth delete failed", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Account delete error", err);
    const message = err instanceof Error ? err.message : "Account deletion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

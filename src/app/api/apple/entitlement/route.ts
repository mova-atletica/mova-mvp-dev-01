import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { getAuthenticatedUser } from "../../../../lib/supabase/routeAuth";
import {
  applyAppleEntitlement,
  findProfileForAppleTransaction,
} from "../../../../lib/billing/entitlements";
import {
  assertAllowedProduct,
  fetchSignedTransactionInfo,
  isAppleSubscriptionActive,
  verifySignedTransaction,
} from "../../../../lib/apple/verify";

export const runtime = "nodejs";

type EntitlementBody = {
  signedTransactionInfo?: unknown;
  transactionId?: unknown;
};

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as EntitlementBody;
    const signedFromClient =
      typeof body.signedTransactionInfo === "string" ? body.signedTransactionInfo.trim() : "";
    const transactionId =
      typeof body.transactionId === "string" ? body.transactionId.trim() : "";

    let signedTransactionInfo = signedFromClient;
    if (!signedTransactionInfo) {
      if (!transactionId) {
        return NextResponse.json(
          { error: "signedTransactionInfo or transactionId is required" },
          { status: 400 }
        );
      }
      signedTransactionInfo = await fetchSignedTransactionInfo(transactionId);
    }

    const tx = await verifySignedTransaction(signedTransactionInfo);
    assertAllowedProduct(tx.productId);

    const originalTransactionId = tx.originalTransactionId;
    if (!originalTransactionId) {
      return NextResponse.json({ error: "Transaction missing originalTransactionId" }, { status: 400 });
    }

    const appleActive = isAppleSubscriptionActive(tx);
    const admin = createAdminClient();
    const profile = await findProfileForAppleTransaction(admin, {
      originalTransactionId,
      userId: auth.user.id,
      appAccountToken: tx.appAccountToken ?? null,
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    await applyAppleEntitlement(admin, profile, {
      appleActive,
      originalTransactionId,
    });

    return NextResponse.json({
      ok: true,
      entitled: appleActive || Boolean(profile.stripe_subscription_id),
      billingSource:
        appleActive && profile.stripe_subscription_id
          ? "both"
          : appleActive
            ? "apple"
            : profile.stripe_subscription_id
              ? "stripe"
              : null,
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "apple_transaction_conflict") {
      return NextResponse.json(
        { error: "This Apple subscription is already linked to another account" },
        { status: 409 }
      );
    }
    if (code === "invalid_product") {
      return NextResponse.json({ error: "Not a Mova Pro product" }, { status: 400 });
    }
    console.error("Apple entitlement error", err);
    const message = err instanceof Error ? err.message : "Entitlement failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

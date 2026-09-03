import { NextResponse } from "next/server";
import { NotificationTypeV2 } from "@apple/app-store-server-library";
import { createAdminClient } from "../../../../lib/supabase/admin";
import {
  applyAppleEntitlement,
  findProfileForAppleTransaction,
} from "../../../../lib/billing/entitlements";
import {
  assertAllowedProduct,
  isAppleSubscriptionActive,
  verifySignedNotification,
  verifySignedTransaction,
} from "../../../../lib/apple/verify";

export const runtime = "nodejs";

const IGNORE_TYPES = new Set<string>([
  NotificationTypeV2.TEST,
  NotificationTypeV2.CONSUMPTION_REQUEST,
  NotificationTypeV2.EXTERNAL_PURCHASE_TOKEN,
  NotificationTypeV2.METADATA_UPDATE,
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { signedPayload?: unknown };
    const signedPayload = typeof body.signedPayload === "string" ? body.signedPayload : "";
    if (!signedPayload) {
      return NextResponse.json({ error: "Missing signedPayload" }, { status: 400 });
    }

    const notification = await verifySignedNotification(signedPayload);
    const type = String(notification.notificationType ?? "");

    if (IGNORE_TYPES.has(type) || !notification.data?.signedTransactionInfo) {
      return NextResponse.json({ received: true });
    }

    const tx = await verifySignedTransaction(notification.data.signedTransactionInfo);
    assertAllowedProduct(tx.productId);

    const originalTransactionId = tx.originalTransactionId;
    if (!originalTransactionId) {
      return NextResponse.json({ received: true });
    }

    let appleActive = isAppleSubscriptionActive(tx);
    if (
      type === NotificationTypeV2.EXPIRED ||
      type === NotificationTypeV2.REFUND ||
      type === NotificationTypeV2.REVOKE ||
      type === NotificationTypeV2.GRACE_PERIOD_EXPIRED
    ) {
      appleActive = false;
    }
    if (
      type === NotificationTypeV2.SUBSCRIBED ||
      type === NotificationTypeV2.DID_RENEW ||
      type === NotificationTypeV2.OFFER_REDEEMED ||
      type === NotificationTypeV2.RENEWAL_EXTENDED ||
      type === NotificationTypeV2.REFUND_REVERSED
    ) {
      appleActive = isAppleSubscriptionActive(tx);
    }

    const admin = createAdminClient();
    const profile = await findProfileForAppleTransaction(admin, {
      originalTransactionId,
      appAccountToken: tx.appAccountToken ?? null,
    });

    if (!profile) {
      console.warn("Apple notification: no profile for transaction", {
        type,
        originalTransactionId,
      });
      return NextResponse.json({ received: true });
    }

    await applyAppleEntitlement(admin, profile, {
      appleActive,
      originalTransactionId,
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "apple_transaction_conflict") {
      console.warn("Apple notification: transaction already linked to another account");
      return NextResponse.json({ received: true });
    }
    if (code === "invalid_product") {
      return NextResponse.json({ received: true });
    }
    console.error("Apple notification error", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}

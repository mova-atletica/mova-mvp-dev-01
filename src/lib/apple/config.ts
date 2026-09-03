export function appleBundleId(): string {
  const id = process.env.APPLE_BUNDLE_ID?.trim();
  if (!id) throw new Error("Missing APPLE_BUNDLE_ID");
  return id;
}

export function appleIapKeyId(): string {
  const id = process.env.APPLE_IAP_KEY_ID?.trim();
  if (!id) throw new Error("Missing APPLE_IAP_KEY_ID");
  return id;
}

export function appleIapIssuerId(): string {
  const id = process.env.APPLE_IAP_ISSUER_ID?.trim();
  if (!id) throw new Error("Missing APPLE_IAP_ISSUER_ID");
  return id;
}

export function appleIapPrivateKeyPem(): string {
  const b64 = process.env.APPLE_IAP_PRIVATE_KEY_BASE64?.trim();
  if (b64) {
    return Buffer.from(b64, "base64").toString("utf8").trim();
  }
  const raw = process.env.APPLE_IAP_PRIVATE_KEY?.trim();
  if (raw) {
    return raw.replace(/\\n/g, "\n").trim();
  }
  throw new Error("Missing APPLE_IAP_PRIVATE_KEY_BASE64");
}

/** Numeric App Store Connect Apple ID. Required to verify Production JWS. */
export function appleAppAppleId(): number | undefined {
  const raw = process.env.APPLE_APP_APPLE_ID?.trim();
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("APPLE_APP_APPLE_ID must be a positive number");
  }
  return n;
}

export function appleAllowedProductIds(): Set<string> | null {
  const raw = process.env.APPLE_IAP_PRODUCT_IDS?.trim();
  if (!raw) return null;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length ? new Set(ids) : null;
}

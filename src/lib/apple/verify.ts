import {
  APIError,
  APIException,
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
  Type,
  VerificationException,
  VerificationStatus,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from "@apple/app-store-server-library";
import {
  appleAllowedProductIds,
  appleAppAppleId,
  appleBundleId,
  appleIapIssuerId,
  appleIapKeyId,
  appleIapPrivateKeyPem,
} from "./config";
import { appleRootCertificates } from "./rootCertificates";

function makeVerifier(environment: Environment): SignedDataVerifier {
  const appAppleId = appleAppAppleId();
  if (environment === Environment.PRODUCTION && appAppleId === undefined) {
    throw new Error("Missing APPLE_APP_APPLE_ID (required to verify Production App Store data)");
  }
  return new SignedDataVerifier(
    appleRootCertificates(),
    true,
    environment,
    appleBundleId(),
    environment === Environment.PRODUCTION ? appAppleId : undefined
  );
}

function jwsEnvironments(): Environment[] {
  return appleAppAppleId() !== undefined
    ? [Environment.PRODUCTION, Environment.SANDBOX]
    : [Environment.SANDBOX];
}

async function verifyAcrossEnvironments<T>(
  run: (verifier: SignedDataVerifier) => Promise<T>
): Promise<T> {
  let lastError: unknown;
  for (const environment of jwsEnvironments()) {
    try {
      return await run(makeVerifier(environment));
    } catch (err) {
      lastError = err;
      if (
        err instanceof VerificationException &&
        err.status === VerificationStatus.INVALID_ENVIRONMENT
      ) {
        continue;
      }
      throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Apple verification failed");
}

export async function verifySignedTransaction(
  signedTransactionInfo: string
): Promise<JWSTransactionDecodedPayload> {
  return verifyAcrossEnvironments((verifier) =>
    verifier.verifyAndDecodeTransaction(signedTransactionInfo)
  );
}

export async function verifySignedNotification(
  signedPayload: string
): Promise<ResponseBodyV2DecodedPayload> {
  return verifyAcrossEnvironments((verifier) =>
    verifier.verifyAndDecodeNotification(signedPayload)
  );
}

function makeApiClient(environment: Environment): AppStoreServerAPIClient {
  return new AppStoreServerAPIClient(
    appleIapPrivateKeyPem(),
    appleIapKeyId(),
    appleIapIssuerId(),
    appleBundleId(),
    environment
  );
}

function isNotFound(err: unknown): boolean {
  if (!(err instanceof APIException)) return false;
  return (
    err.httpStatusCode === 404 ||
    err.apiError === APIError.TRANSACTION_ID_NOT_FOUND ||
    err.apiError === APIError.ORIGINAL_TRANSACTION_ID_NOT_FOUND
  );
}

export async function fetchSignedTransactionInfo(
  transactionId: string
): Promise<string> {
  const environments = [Environment.PRODUCTION, Environment.SANDBOX];
  let lastError: unknown;
  for (const environment of environments) {
    try {
      const response = await makeApiClient(environment).getTransactionInfo(transactionId);
      if (!response.signedTransactionInfo) {
        throw new Error("Apple transaction info missing signedTransactionInfo");
      }
      return response.signedTransactionInfo;
    } catch (err) {
      lastError = err;
      if (isNotFound(err)) continue;
      throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Apple transaction not found");
}

export function assertAllowedProduct(productId: string | undefined): void {
  if (!productId) {
    throw Object.assign(new Error("Missing Apple product ID"), { code: "invalid_product" });
  }
  const allowed = appleAllowedProductIds();
  if (allowed && !allowed.has(productId)) {
    throw Object.assign(new Error("Apple product is not a Mova Pro subscription"), {
      code: "invalid_product",
    });
  }
}

export function isAppleSubscriptionActive(tx: JWSTransactionDecodedPayload): boolean {
  if (tx.revocationDate) return false;
  const type = tx.type;
  if (
    type &&
    type !== Type.AUTO_RENEWABLE_SUBSCRIPTION &&
    type !== "Auto-Renewable Subscription"
  ) {
    return false;
  }
  if (!tx.expiresDate) return false;
  return tx.expiresDate > Date.now();
}

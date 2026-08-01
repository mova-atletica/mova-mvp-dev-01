/** sessionStorage key: user opened Pro paywall via Studio gate before Checkout redirect. */
export const PENDING_STUDIO_ACCESS_KEY = "mova_pending_studio_access";

export function markPendingStudioAccess(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_STUDIO_ACCESS_KEY, "1");
}

export function clearPendingStudioAccess(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_STUDIO_ACCESS_KEY);
}

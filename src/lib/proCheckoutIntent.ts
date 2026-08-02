/** sessionStorage key: user opened Studio gate and should resume after auth/Checkout. */
export const PENDING_STUDIO_ACCESS_KEY = "mova_pending_studio_access";

export function markPendingStudioAccess(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_STUDIO_ACCESS_KEY, "1");
}

export function clearPendingStudioAccess(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_STUDIO_ACCESS_KEY);
}

export function hasPendingStudioAccess(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(PENDING_STUDIO_ACCESS_KEY) === "1";
}

/** Public App Store listing for Mova Atletica iOS. */
export const MOVA_APP_STORE_URL =
  "https://apps.apple.com/us/app/mova-atletica/id6775322595";

/** App Store icon asset (white squircle). */
export const MOVA_APP_STORE_ICON_SRC = "/images/brand/mova-atletica-app-icon.webp";

export function openMovaAppStore(): void {
  if (typeof window === "undefined") return;
  window.open(MOVA_APP_STORE_URL, "_blank", "noopener,noreferrer");
}

import { PRIVACY_PATH, TERMS_PATH } from "../../lib/legalUrls";

export const ARCHIVE_RAIL_WIDTH_COLLAPSED = "3rem";

export const archiveBorderRight = { borderRight: "1px solid var(--mega-menu-border)" } as const;
export const archiveBorderBottom = { borderBottom: "1px solid var(--border)" } as const;
export const archiveBorderTop = { borderTop: "1px solid var(--border)" } as const;
export const archiveBorderAll = { border: "1px solid var(--border-secondary)" } as const;

export const archiveCollapsedRailControlClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg backdrop-blur-md";

export const ARCHIVE_PRIVACY_URL = PRIVACY_PATH;
export const ARCHIVE_TERMS_URL = TERMS_PATH;

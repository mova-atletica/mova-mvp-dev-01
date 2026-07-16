/** Shared horizontal inset for archive main column (matches home hero & carousels). */
export const ARCHIVE_CONTENT_LAYOUT_STYLE = {
  maxWidth: "2560px",
  marginLeft: "2%",
  marginRight: "2%",
  width: "96%",
} as const;

export const archiveContentClassName = "mx-auto w-[96%] max-w-[2560px]";

/** Featured hero + program/creator page hero — outer section spacing. */
export const ARCHIVE_HERO_SECTION_CLASS = "pb-6 pt-6";

export const ARCHIVE_HERO_CARD_CLASS = "relative isolate overflow-hidden rounded-2xl";

export const ARCHIVE_HERO_CARD_STYLE = {
  borderRadius: "1rem",
  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
} as const;

export const ARCHIVE_HERO_TALL_HEIGHT_STYLE = {
  minHeight: "420px",
  height: "min(52vh, 480px)",
} as const;

/** Narrow portrait studio card (legacy). */
export const ARCHIVE_HERO_STUDIO_PORTRAIT_STYLE = {
  width: "11rem",
  minWidth: "11rem",
  maxWidth: "11rem",
  flexShrink: 0,
  minHeight: "360px",
  height: "min(48vh, 420px)",
} as const;

/** Portrait featured carousel beside mini apps (desktop). */
export const ARCHIVE_HERO_PORTRAIT_CAROUSEL_STYLE = {
  width: "15rem",
  minWidth: "15rem",
  maxWidth: "15rem",
  flexShrink: 0,
  minHeight: "360px",
  height: "min(48vh, 420px)",
} as const;

/** Legacy horizontal carousel cards (library row — superseded by hero icon grid). */
export const MINI_APP_CARD_SIZE = {
  width: 280,
  height: 200,
} as const;

/** Sports mini app tile (Figma ~178×181px). */
export const HOME_TOOLS_SPORTS_TILE = {
  width: 178,
  height: 181,
} as const;

/** Mova Studio hero tile (Figma ~343×405px). */
export const HOME_TOOLS_STUDIO_TILE = {
  width: 343,
  height: 405,
} as const;

/** Gap between studio card and sports grid / within grid (Figma). */
export const HOME_TOOLS_HERO_GAP = {
  row: 24,
  gridColumn: 24,
  gridRow: 43,
} as const;

/** Sports slots in the 3×2 grid (5 apps + 1 empty). */
export const HOME_TOOLS_SPORTS_GRID_SLOTS = 6;

/** Flex ratio for full-width tools hero (studio column vs sports grid). */
export const HOME_TOOLS_HERO_STUDIO_FR = HOME_TOOLS_STUDIO_TILE.width;
export const HOME_TOOLS_HERO_SPORTS_FR =
  HOME_TOOLS_SPORTS_TILE.width * 3 + HOME_TOOLS_HERO_GAP.gridColumn * 2;

/** Leaderboard column — ~2 sport tiles wide (future: toggle with global movement feed). */
export const HOME_TOOLS_HERO_LEADERBOARD_FR =
  HOME_TOOLS_SPORTS_TILE.width * 2 + HOME_TOOLS_HERO_GAP.gridColumn;

/** Full-width hero section — edge padding only, tiles span available width. */
export const HOME_TOOLS_HERO_LAYOUT_STYLE = {
  width: "100%",
  maxWidth: "2560px",
  marginLeft: "auto",
  marginRight: "auto",
  paddingLeft: "2%",
  paddingRight: "2%",
  boxSizing: "border-box" as const,
};

export const ARCHIVE_HERO_COMPACT_HEIGHT_STYLE = {
  minHeight: "min(32vh, 260px)",
} as const;

export const ARCHIVE_HERO_CONTENT_CLASS = "relative z-10 w-full max-w-xl py-6 sm:py-8";

export const ARCHIVE_HERO_CONTENT_PADDING_STYLE = {
  paddingLeft: "clamp(2rem, 5vw, 3.5rem)",
  paddingRight: "clamp(1.25rem, 3vw, 2rem)",
} as const;

export function archiveHeroBackground(image: string): string {
  return image.startsWith("linear-gradient")
    ? image
    : `url(${image}) center/cover no-repeat`;
}

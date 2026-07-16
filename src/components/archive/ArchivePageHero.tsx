import type { ReactNode } from "react";
import {
  ARCHIVE_HERO_CARD_CLASS,
  ARCHIVE_HERO_CARD_STYLE,
  ARCHIVE_HERO_COMPACT_HEIGHT_STYLE,
  ARCHIVE_HERO_CONTENT_CLASS,
  ARCHIVE_HERO_CONTENT_PADDING_STYLE,
  ARCHIVE_HERO_SECTION_CLASS,
  archiveHeroBackground,
} from "../../lib/archiveLayout";

interface ArchivePageHeroProps {
  background: string;
  children: ReactNode;
  ariaLabel?: string;
}

export default function ArchivePageHero({
  background,
  children,
  ariaLabel,
}: ArchivePageHeroProps) {
  const heroBg = archiveHeroBackground(background);

  return (
    <section className={ARCHIVE_HERO_SECTION_CLASS} aria-label={ariaLabel}>
      <div
        className={`${ARCHIVE_HERO_CARD_CLASS} flex items-center`}
        style={{
          ...ARCHIVE_HERO_CARD_STYLE,
          ...ARCHIVE_HERO_COMPACT_HEIGHT_STYLE,
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: heroBg, borderRadius: "1rem" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.2) 100%)",
            borderRadius: "1rem",
          }}
        />
        <div className={ARCHIVE_HERO_CONTENT_CLASS} style={ARCHIVE_HERO_CONTENT_PADDING_STYLE}>
          {children}
        </div>
      </div>
    </section>
  );
}

import {
  ARCHIVE_PRIVACY_URL,
  ARCHIVE_TERMS_URL,
  archiveBorderTop,
} from "./archiveRailTheme";

export function ArchiveRailFooter({ compact = false }: { compact?: boolean }) {
  const year = new Date().getFullYear();

  if (compact) {
    return (
      <footer className="border-t px-4 py-4" style={{ borderColor: "var(--border)" }}>
        <p className="mb-2 text-[10px]" style={{ color: "var(--section-subtitle)" }}>
          © {year} Mova Atletica, Inc.
        </p>
        <div className="flex flex-wrap gap-3 text-[10px]">
          <a
            href={ARCHIVE_PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: "var(--section-subtitle)" }}
          >
            Privacy
          </a>
          <a
            href={ARCHIVE_TERMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: "var(--section-subtitle)" }}
          >
            Terms
          </a>
        </div>
      </footer>
    );
  }

  return (
    <footer className="flex-shrink-0 space-y-2 px-6 pb-6 pt-4" style={archiveBorderTop}>
      <p className="text-[10px] leading-relaxed" style={{ color: "var(--section-subtitle)" }}>
        © {year} Mova Atletica, Inc.
      </p>
      <div className="flex flex-col gap-1.5 text-[10px]">
        <a
          href={ARCHIVE_PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:underline"
          style={{ color: "var(--section-subtitle)" }}
        >
          Privacy Policy
        </a>
        <a
          href={ARCHIVE_TERMS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:underline"
          style={{ color: "var(--section-subtitle)" }}
        >
          Terms of Service
        </a>
      </div>
    </footer>
  );
}

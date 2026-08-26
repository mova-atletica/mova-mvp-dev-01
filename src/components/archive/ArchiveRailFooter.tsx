import Link from "next/link";
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
          <Link
            href={ARCHIVE_PRIVACY_URL}
            className="underline"
            style={{ color: "var(--section-subtitle)" }}
          >
            Privacy
          </Link>
          <Link
            href={ARCHIVE_TERMS_URL}
            className="underline"
            style={{ color: "var(--section-subtitle)" }}
          >
            Terms
          </Link>
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
        <Link
          href={ARCHIVE_PRIVACY_URL}
          className="transition-colors hover:underline"
          style={{ color: "var(--section-subtitle)" }}
        >
          Privacy Policy
        </Link>
        <Link
          href={ARCHIVE_TERMS_URL}
          className="transition-colors hover:underline"
          style={{ color: "var(--section-subtitle)" }}
        >
          Terms of Service
        </Link>
      </div>
    </footer>
  );
}

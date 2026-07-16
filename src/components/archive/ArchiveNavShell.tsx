"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import AppMegaMenu from "../AppMegaMenu";
import { ArchiveRailFooter } from "./ArchiveRailFooter";
import {
  ARCHIVE_RAIL_WIDTH_COLLAPSED,
  archiveBorderRight,
  archiveCollapsedRailControlClass,
} from "./archiveRailTheme";
import { ARCHIVE_CONTENT_LAYOUT_STYLE } from "../../lib/archiveLayout";

interface ArchiveNavShellProps {
  children: ReactNode;
  /** Full-height studio layout without content column padding/scroll. */
  studioLayout?: boolean;
}

export default function ArchiveNavShell({ children, studioLayout = false }: ArchiveNavShellProps) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  const collapsedRail = (
    <div className="flex h-full flex-col items-center gap-3 py-3">
      <Link
        href="/"
        className={archiveCollapsedRailControlClass}
        aria-label="Mova Archive home"
        title="Mova Archive"
      >
        <Image
          src="/images/brand/logo/Logo_Contained.svg"
          alt=""
          width={24}
          height={24}
          className="h-8 w-8"
          style={{ filter: "var(--logo-color)" }}
        />
      </Link>

      <AppMegaMenu activeApp="archive" iconOnly />
    </div>
  );

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {isDesktop ? (
        <aside
          className="fixed left-0 top-0 z-20 flex h-[100dvh] max-h-[100dvh] min-h-0 min-w-0 flex-shrink-0 flex-col overflow-hidden bg-[var(--header-bg)] backdrop-blur-xl"
          style={{
            width: ARCHIVE_RAIL_WIDTH_COLLAPSED,
            ...archiveBorderRight,
          }}
        >
          <div className="flex h-full min-h-0 flex-col">{collapsedRail}</div>
        </aside>
      ) : null}

      <div
        className="relative flex min-h-0 min-w-0 flex-1 flex-col"
        style={isDesktop ? { marginLeft: ARCHIVE_RAIL_WIDTH_COLLAPSED } : undefined}
      >
        <div
          className={`open-move-studio-panel-scroll min-h-0 min-w-0 flex-1 ${studioLayout ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}
        >
          {!isDesktop ? (
            <div
              className="flex items-center justify-between gap-3 bg-transparent pb-2 pt-4"
              style={studioLayout ? { paddingLeft: "2%", paddingRight: "2%" } : ARCHIVE_CONTENT_LAYOUT_STYLE}
            >
              <Link href="/" className="min-w-0 flex-1 bg-transparent">
                <Image
                  src="/images/brand/logo/Logo_Horizontal.svg"
                  alt="Mova Atletica"
                  width={96}
                  height={24}
                  className="w-20 max-w-full"
                  style={{ height: "auto", filter: "var(--logo-color)" }}
                />
              </Link>
              <AppMegaMenu activeApp="archive" ghost />
            </div>
          ) : null}

          {studioLayout ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
          ) : (
            <div className="mx-auto space-y-6 pb-16 pt-0" style={ARCHIVE_CONTENT_LAYOUT_STYLE}>
              {children}
            </div>
          )}

          {!isDesktop && !studioLayout ? <ArchiveRailFooter compact /> : null}
        </div>
      </div>
    </div>
  );
}

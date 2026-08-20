"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { PanelLeftClose, SlidersHorizontal } from "lucide-react";
import AppMegaMenu from "./AppMegaMenu";
import LibraryFilterBar from "./LibraryFilterBar";
import type { HomeFilterState } from "../lib/homeFilters";
import { ARCHIVE_CONTENT_LAYOUT_STYLE } from "../lib/archiveLayout";

const RAIL_WIDTH_OPEN = "17.5rem";
const RAIL_WIDTH_COLLAPSED = "3rem";
const RAIL_WIDTH_TRANSITION = "width 0.35s ease-in-out, margin-left 0.35s ease-in-out";

const borderRightTheme = { borderRight: "1px solid var(--mega-menu-border)" } as const;
const mobileTopRailBorder = { borderBottom: "1px solid var(--mega-menu-border)" } as const;
const borderBottomTheme = { borderBottom: "1px solid var(--border)" } as const;
const borderTopTheme = { borderTop: "1px solid var(--border)" } as const;
const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const collapsedRailControlClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg backdrop-blur-md";

const PRIVACY_URL =
  "https://app.termly.io/policy-viewer/policy.html?policyUUID=4d4ccf3e-a802-44df-aa73-51822d5d7f9d";
const TERMS_URL =
  "https://app.termly.io/policy-viewer/policy.html?policyUUID=fdbd3538-3be4-42d1-8c89-ba7676b7d238";

const LibraryShellContext = createContext({ showRailFilters: false });

export function useLibraryShell() {
  return useContext(LibraryShellContext);
}

interface LibraryShellProps {
  children: ReactNode;
  filters: HomeFilterState;
  onFiltersChange: (filters: HomeFilterState) => void;
  muscleGroupOptions: string[];
  equipmentOptions: string[];
  /** When false, keep rail chrome (logo / mega menu) but hide filter controls. */
  showFilters?: boolean;
  /** Home uses a decorative canvas; keep the scroll column transparent on mobile so glass tiles can blur it. */
  homepageCanvas?: boolean;
}

export function LibraryMobileFilterSection({
  filters,
  onFiltersChange,
  muscleGroupOptions,
  equipmentOptions,
}: Omit<LibraryShellProps, "children" | "showFilters">) {
  const { showRailFilters } = useLibraryShell();

  if (showRailFilters) return null;

  return (
    <div className="md:hidden">
      <LibraryFilterBar
        layout="mobile-collapsible"
        filters={filters}
        onFiltersChange={onFiltersChange}
        muscleGroupOptions={muscleGroupOptions}
        equipmentOptions={equipmentOptions}
      />
    </div>
  );
}

function RailFooter({ compact = false }: { compact?: boolean }) {
  const year = new Date().getFullYear();

  if (compact) {
    return (
      <footer
        className="border-t px-4 py-4"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="mb-2 text-[10px]" style={{ color: "var(--section-subtitle)" }}>
          © {year} Mova Atletica, Inc.
        </p>
        <div className="flex flex-wrap gap-3 text-[10px]">
          <a
            href={PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: "var(--section-subtitle)" }}
          >
            Privacy
          </a>
          <a
            href={TERMS_URL}
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
    <footer
      className="flex-shrink-0 space-y-2 px-6 pb-6 pt-4"
      style={borderTopTheme}
    >
      <p className="text-[10px] leading-relaxed" style={{ color: "var(--section-subtitle)" }}>
        © {year} Mova Atletica, Inc.
      </p>
      <div className="flex flex-col gap-1.5 text-[10px]">
        <a
          href={PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:underline"
          style={{ color: "var(--section-subtitle)" }}
        >
          Privacy Policy
        </a>
        <a
          href={TERMS_URL}
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

function CollapsedRailIconButton({
  onClick,
  label,
  title,
  children,
}: {
  onClick: () => void;
  label: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={borderAllTheme}
      className={`${collapsedRailControlClass} text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:text-[color:var(--foreground)]`}
      aria-label={label}
      title={title ?? label}
    >
      {children}
    </button>
  );
}

export default function LibraryShell({
  children,
  filters,
  onFiltersChange,
  muscleGroupOptions,
  equipmentOptions,
  showFilters = true,
  homepageCanvas = false,
}: LibraryShellProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  /** Side rail from tablet up; phone-only uses top bar. */
  const [showSideRail, setShowSideRail] = useState(false);
  /** Home mobile uses body scroll so glass tiles can blur the fixed canvas mount. */
  const [homepageMobileCanvas, setHomepageMobileCanvas] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setShowSideRail(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!homepageCanvas) {
      setHomepageMobileCanvas(false);
      return;
    }
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setHomepageMobileCanvas(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [homepageCanvas]);

  const shellMobileCanvas = homepageCanvas && homepageMobileCanvas;

  // Match OpenMoveStudio: page scroll lives in the main column — except home mobile (body scroll for glass blur).
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    if (!shellMobileCanvas) {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
    } else {
      html.style.overflow = "";
      body.style.overflow = "";
    }
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [shellMobileCanvas]);

  const railWidth = showFilters && panelOpen ? RAIL_WIDTH_OPEN : RAIL_WIDTH_COLLAPSED;

  const railPanelContent =
    showFilters && panelOpen ? (
    <>
      <div className="flex-shrink-0 px-6 pb-4 pt-6" style={borderBottomTheme}>
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2.5" aria-label="Mova Archive home">
            <Image
              src="/images/brand/logo/Logo_Contained.svg"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0"
              style={{ filter: "var(--logo-color)" }}
            />
            <span
              className="truncate font-light uppercase tracking-wider text-[color:var(--foreground)]"
              style={{ fontSize: "11px" }}
            >
              Mova Archive
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <AppMegaMenu activeApp="archive" />
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              style={borderAllTheme}
              className="inline-flex rounded-lg p-2 text-[color:var(--muted-foreground)] backdrop-blur-md transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]"
              aria-label="Collapse panel"
              title="Collapse panel"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="open-move-studio-panel-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-4">
        <LibraryFilterBar
          layout="rail"
          filters={filters}
          onFiltersChange={onFiltersChange}
          muscleGroupOptions={muscleGroupOptions}
          equipmentOptions={equipmentOptions}
        />
      </div>

      <RailFooter />
    </>
  ) : (
    <div className="flex h-full flex-col items-center gap-3 py-3">
      <Link
        href="/"
        className={collapsedRailControlClass}
        aria-label="Mova Archive home"
        title="Mova Archive"
      >
        <Image
          src="/images/brand/logo/Logo_Contained.svg"
          alt="Mova Archive"
          width={24}
          height={24}
          className="h-8 w-8"
          style={{ filter: "var(--logo-color)" }}
        />
      </Link>
      <AppMegaMenu activeApp="archive" iconOnly />
      {showFilters ? (
        <CollapsedRailIconButton
          onClick={() => setPanelOpen(true)}
          label="Open filters"
          title="Open filters"
        >
          <SlidersHorizontal size={18} />
        </CollapsedRailIconButton>
      ) : null}
    </div>
  );

  return (
    <LibraryShellContext.Provider value={{ showRailFilters: showFilters && showSideRail }}>
      <div
        className={`flex w-full text-[var(--foreground)]${
          shellMobileCanvas
            ? " library-shell--homepage-mobile relative z-[1]"
            : ` h-[100dvh] overflow-hidden bg-[var(--background)]${
                homepageCanvas ? " max-lg:bg-transparent" : ""
              }`
        }`}
      >
        {showSideRail ? (
          <aside
            className="fixed left-0 top-0 z-20 flex h-[100dvh] max-h-[100dvh] min-h-0 min-w-0 flex-shrink-0 flex-col overflow-hidden bg-[var(--mega-menu-bg)] shadow-2xl backdrop-blur-xl"
            style={{
              width: railWidth,
              transition: RAIL_WIDTH_TRANSITION,
              ...borderRightTheme,
            }}
          >
            <div className="flex h-full min-h-0 flex-col">{railPanelContent}</div>
          </aside>
        ) : null}

      <div
        className={`library-shell-column relative flex min-h-0 min-w-0 flex-1 flex-col${
          homepageCanvas && !shellMobileCanvas ? " max-lg:bg-transparent" : ""
        }`}
        style={
          showSideRail
            ? {
                marginLeft: railWidth,
                transition: "margin-left 0.35s ease-in-out",
              }
            : undefined
        }
      >
        <div
          className={`library-shell-scroll open-move-studio-panel-scroll min-h-0 min-w-0 flex-1${
            shellMobileCanvas
              ? ""
              : " overflow-y-auto"
          }${homepageCanvas && !shellMobileCanvas ? " max-lg:bg-transparent" : ""}`}
        >
          {!showSideRail ? (
            <div
              className="sticky top-0 z-10 bg-[var(--mega-menu-bg)] shadow-2xl backdrop-blur-xl"
              style={mobileTopRailBorder}
            >
              <div
                className="flex items-center gap-2 py-2"
                style={ARCHIVE_CONTENT_LAYOUT_STYLE}
              >
                <Link
                  href="/"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-transparent"
                  aria-label="Mova Archive home"
                  title="Mova Archive"
                >
                  <Image
                    src="/images/brand/logo/Logo_Contained.svg"
                    alt="Mova Archive"
                    width={24}
                    height={24}
                    className="h-8 w-8"
                    style={{ filter: "var(--logo-color)" }}
                  />
                </Link>
                <AppMegaMenu activeApp="archive" iconOnly ghost />
              </div>
            </div>
          ) : null}

          {children}

          {!showSideRail ? <RailFooter compact /> : null}
        </div>
      </div>
    </div>
    </LibraryShellContext.Provider>
  );
}

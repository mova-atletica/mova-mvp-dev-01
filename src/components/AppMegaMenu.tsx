"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { Clapperboard, ExternalLink, Home, Lock, MoreVertical, User } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useAccount } from "../contexts/MockAuthContext";
import { EffectSelectedCheckIcon } from "../app/motion-explore/EffectSelectedCheckIcon";
import { MovaPopoverMotionInner } from "./MovaPopoverMotionInner";
import {
  EMBEDDED_MODAL_POPOVER_Z,
  getEmbeddedModalPopoverRoot,
} from "../lib/embeddedModalPopover";

const menuTextClass = "text-[color:var(--mega-menu-text)]";
const menuTextMutedClass = "text-[color:var(--mega-menu-text-muted)]";
const menuItemHoverClass =
  "transition-colors hover:bg-[color:var(--mega-menu-hover-bg)]";
const menuPanelStyle = {
  border: "1px solid var(--mega-menu-border)",
  backgroundColor: "var(--mega-menu-bg)",
} as const;

export type AppMegaMenuActive = "archive" | "studio" | "coach";

interface AppMegaMenuProps {
  activeApp: AppMegaMenuActive;
  /** When true, render only the ⋮ icon trigger (collapsed rail). */
  iconOnly?: boolean;
  /** Transparent trigger (mobile top chrome). */
  ghost?: boolean;
  /** Raise popover above embedded Open Move modal layers (shell z-290, rail z-310). */
  embeddedInModal?: boolean;
}

function ThemeToggleMenuItem() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`mt-1 flex min-h-[44px] w-full items-center justify-center rounded-md px-2 py-2 ${menuTextClass} ${menuItemHoverClass}`}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: "var(--mega-menu-text)" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ) : (
        <svg
          className={`h-6 w-6 ${menuTextClass}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )}
    </button>
  );
}

export default function AppMegaMenu({
  activeApp,
  iconOnly = false,
  ghost = false,
  embeddedInModal = false,
}: AppMegaMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, profile, openSignIn, hasCoachAccess } = useAccount();
  const isArchiveHome = pathname === "/";
  const isCoachStudioHome =
    pathname === "/coach-studio" || pathname.startsWith("/coach-studio/");

  const archiveItemClass = `flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-normal text-xs ${menuTextClass} ${
    isArchiveHome ? "bg-[color:var(--mega-menu-active-bg)]" : menuItemHoverClass
  }`;
  const coachStudioItemClass = hasCoachAccess
    ? `mt-1 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left font-normal text-xs ${menuTextClass} ${
        isCoachStudioHome ? "bg-[color:var(--mega-menu-active-bg)]" : menuItemHoverClass
      }`
    : `mt-1 flex w-full cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-left font-normal text-xs opacity-55 ${menuTextMutedClass}`;

  const embeddedPopoverRoot = embeddedInModal ? getEmbeddedModalPopoverRoot() : null;

  return (
    <Popover.Root modal={embeddedInModal ? false : undefined}>
      <Popover.Trigger asChild>
        <button
          type="button"
          style={
            ghost
              ? { border: "1px solid transparent", backgroundColor: "transparent" }
              : {
                  border: "1px solid var(--mega-menu-border)",
                  backgroundColor: "var(--mega-menu-trigger-bg)",
                }
          }
          className={`flex-shrink-0 rounded-lg text-[color:var(--mega-menu-trigger-text)] transition-all hover:bg-[color:var(--mega-menu-hover-bg)] hover:text-[color:var(--mega-menu-trigger-hover-text)] ${ghost ? "" : "backdrop-blur-md"} ${iconOnly ? "inline-flex h-9 w-9 items-center justify-center" : "p-2"}`}
          title="Apps & Settings"
          aria-label="Apps and settings"
        >
          <MoreVertical size={iconOnly ? 18 : 16} />
        </button>
      </Popover.Trigger>
      <Popover.Portal container={embeddedPopoverRoot ?? undefined}>
        <Popover.Content
          side={iconOnly ? "right" : "bottom"}
          align={iconOnly ? "start" : "end"}
          sideOffset={iconOnly ? 6 : 8}
          collisionPadding={{ top: 24, bottom: 16, left: 12, right: 12 }}
          style={{
            ...menuPanelStyle,
            ...(embeddedInModal ? { zIndex: EMBEDDED_MODAL_POPOVER_Z } : undefined),
          }}
          className={`${embeddedInModal ? "pointer-events-auto" : "z-[220]"} mova-popover-motion ml-2 w-60 rounded-lg p-2.5 shadow-2xl backdrop-blur-xl`}
        >
          <MovaPopoverMotionInner>
          <div
            className={`px-2 py-1 text-[9px] font-normal uppercase tracking-wider ${menuTextMutedClass}`}
          >
            Apps
          </div>
          <Link href="/" className={archiveItemClass}>
            <Home size={12} />
            <span>Mova Archive</span>
            {isArchiveHome ? (
              <span className="ml-auto flex shrink-0 items-center justify-center text-[var(--accent,#3b82f6)]">
                <EffectSelectedCheckIcon className="scale-[0.85]" />
              </span>
            ) : null}
          </Link>
          {hasCoachAccess ? (
            <button
              type="button"
              onClick={() => router.push("/coach-studio")}
              className={coachStudioItemClass}
            >
              <Clapperboard className="h-3 w-3" />
              <span>Coach Studio</span>
              {isCoachStudioHome ? (
                <span className="ml-auto flex shrink-0 items-center justify-center text-[var(--accent,#3b82f6)]">
                  <EffectSelectedCheckIcon className="scale-[0.85]" />
                </span>
              ) : null}
            </button>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className={coachStudioItemClass}
            >
              <Clapperboard className="h-3 w-3" />
              <span>Coach Studio</span>
              <Lock className="ml-auto h-3 w-3 shrink-0 opacity-80" aria-hidden />
            </button>
          )}
          <div className="my-2 h-px bg-[color:var(--mega-menu-border)]" />
          <div
            className={`px-2 py-1 text-[9px] font-normal uppercase tracking-wider ${menuTextMutedClass}`}
          >
            Account
          </div>
          {isAuthenticated ? (
            <Link
              href="/account"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 font-normal text-xs ${menuTextClass} ${menuItemHoverClass}`}
            >
              <User size={12} />
              <span className="truncate">{profile?.displayName || "Account"}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openSignIn()}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-normal text-xs ${menuTextClass} ${menuItemHoverClass}`}
            >
              <User size={12} />
              <span>Sign In / Create Account</span>
            </button>
          )}
          <a
            href="https://mova-atletica.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-1 flex items-center gap-2 rounded-md px-2 py-1.5 font-normal text-xs ${menuTextClass} ${menuItemHoverClass}`}
          >
            <ExternalLink size={12} />
            <span>About Mova</span>
          </a>
          <div className="my-2 h-px bg-[color:var(--mega-menu-border)]" />
          <ThemeToggleMenuItem />
          </MovaPopoverMotionInner>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

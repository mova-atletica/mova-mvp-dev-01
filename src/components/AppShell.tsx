"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import ConditionalFooter from "./ConditionalFooter";

const STUDIO_PATH = "/open-move-v2";
const COACH_STUDIO_PATH = "/coach-studio";
const LIBRARY_PATH = "/";

function isAuthShellPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname === "/account" || pathname.startsWith("/account/")) return true;
  if (pathname === "/partner/apply" || pathname.startsWith("/partner/")) return true;
  return false;
}

function isLegalShellPath(pathname: string): boolean {
  return pathname === "/terms" || pathname === "/privacy";
}

function isArchiveShellPath(pathname: string): boolean {
  if (pathname === STUDIO_PATH || pathname.startsWith(`${STUDIO_PATH}/`)) return true;
  if (pathname === COACH_STUDIO_PATH || pathname.startsWith(`${COACH_STUDIO_PATH}/`)) {
    return true;
  }
  if (pathname === LIBRARY_PATH) return true;
  if (pathname === "/library-mvp" || pathname.startsWith("/library-mvp/")) return true;
  if (pathname === "/account" || pathname.startsWith("/account/")) return true;
  if (pathname.startsWith("/programs/")) return true;
  if (pathname.startsWith("/creators/")) return true;
  if (pathname.startsWith("/sequences/")) return true;
  if (pathname.startsWith("/archive/exercises/")) return true;
  return false;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStudio =
    pathname === STUDIO_PATH ||
    pathname.startsWith(`${STUDIO_PATH}/`) ||
    pathname === COACH_STUDIO_PATH ||
    pathname.startsWith(`${COACH_STUDIO_PATH}/`);
  const isLibrary = isArchiveShellPath(pathname);

  if (isStudio || isLibrary || isAuthShellPath(pathname) || isLegalShellPath(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="pt-32">{children}</main>
      <ConditionalFooter />
    </>
  );
}

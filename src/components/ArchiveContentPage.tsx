"use client";

import type { ReactNode } from "react";
import ArchiveNavShell from "./archive/ArchiveNavShell";

interface ArchiveContentPageProps {
  children: ReactNode;
}

/** Content pages (programs, creators) with collapsed nav rail + scrollable main column. */
export default function ArchiveContentPage({ children }: ArchiveContentPageProps) {
  return <ArchiveNavShell>{children}</ArchiveNavShell>;
}

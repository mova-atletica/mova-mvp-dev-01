"use client";

import Link from "next/link";
import AppMegaMenu from "../AppMegaMenu";

interface AuthPageShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function AuthPageShell({ title, subtitle, children }: AuthPageShellProps) {
  return (
    <main className="homepage-canvas min-h-screen">
      <div className="homepage-canvas-backdrop" aria-hidden>
        <div className="homepage-canvas-gradient" />
        <div className="homepage-canvas-noise" />
        <div className="homepage-canvas-dots" />
      </div>

      <div className="homepage-canvas-content relative z-10 mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-[color:var(--foreground)] underline-offset-2 hover:underline"
          >
            ← Mova Archive
          </Link>
          <AppMegaMenu activeApp="archive" />
        </div>

        <div className="flex flex-1 flex-col justify-center pb-12">
          <h1 className="text-2xl font-bold text-[color:var(--foreground)]">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{subtitle}</p>
          ) : null}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </main>
  );
}

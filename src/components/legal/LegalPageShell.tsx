import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "../Logo";

export default function LegalPageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <header
        className="sticky top-0 z-20 flex items-center justify-between gap-4 px-5 py-4 backdrop-blur-md"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "color-mix(in srgb, var(--background) 85%, transparent)",
        }}
      >
        <Link href="/" className="inline-flex items-center gap-3" aria-label="Mova home">
          <Logo className="w-8" style={{ height: "auto" }} />
          <span className="text-sm font-medium tracking-wide" style={{ color: "var(--section-subtitle)" }}>
            Mova Atletica
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-xs" style={{ color: "var(--section-subtitle)" }}>
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {children}
      </main>
    </div>
  );
}

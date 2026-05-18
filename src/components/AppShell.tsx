"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import ConditionalFooter from "./ConditionalFooter";

const STUDIO_PATH = "/open-move-v2";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStudio = pathname === STUDIO_PATH;

  if (isStudio) {
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

"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Header from "./Header";
import ConditionalFooter from "./ConditionalFooter";

const STUDIO_PATH = "/open-move-v2";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStudio = pathname === STUDIO_PATH;

  useEffect(() => {
    if (isStudio) {
      document.body.classList.remove("pt-32");
      document.body.classList.add("studio-route");
    } else {
      document.body.classList.remove("studio-route");
      document.body.classList.add("pt-32");
    }
  }, [isStudio]);

  if (isStudio) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main>{children}</main>
      <ConditionalFooter />
    </>
  );
}

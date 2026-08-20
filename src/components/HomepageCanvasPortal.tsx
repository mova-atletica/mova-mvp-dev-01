"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const CANVAS_MOUNT_ID = "homepage-canvas-mount";

/** Renders the homepage gradient + dots below `#app-root` so glass tiles can blur it. */
export default function HomepageCanvasPortal() {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setMountNode(document.getElementById(CANVAS_MOUNT_ID));

    const mq = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setActive(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (!mounted || !active || !mountNode) {
    return null;
  }

  return createPortal(
    <>
      <div className="homepage-canvas-gradient" />
      <div className="homepage-canvas-noise" />
      <div className="homepage-canvas-dots" />
    </>,
    mountNode
  );
}

"use client";

import React, { createContext, useContext } from "react";
import type { AssetVideoEngine } from "./useAssetVideoEngine";

const AssetVideoEngineContext = createContext<AssetVideoEngine | null>(null);

export function AssetVideoEngineProvider({
  engine,
  children,
}: {
  engine: AssetVideoEngine;
  children: React.ReactNode;
}) {
  return (
    <AssetVideoEngineContext.Provider value={engine}>
      {children}
    </AssetVideoEngineContext.Provider>
  );
}

export function useOptionalAssetVideoEngine(): AssetVideoEngine | null {
  return useContext(AssetVideoEngineContext);
}

export function useAssetVideoEngineContext(): AssetVideoEngine {
  const ctx = useContext(AssetVideoEngineContext);
  if (!ctx) {
    throw new Error("useAssetVideoEngineContext must be used within AssetVideoEngineProvider");
  }
  return ctx;
}

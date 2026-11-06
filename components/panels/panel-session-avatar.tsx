"use client";

import { createContext, useContext, useMemo, useState } from "react";

type PanelSessionAvatarContextValue = {
  avatarUrl: string | null;
  setAvatarUrl: (avatarUrl: string | null) => void;
};

const PanelSessionAvatarContext =
  createContext<PanelSessionAvatarContextValue | null>(null);

export function PanelSessionAvatarProvider({
  avatarUrl: initialAvatarUrl,
  children,
}: {
  avatarUrl: string | null;
  children: React.ReactNode;
}) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [prevInitialAvatarUrl, setPrevInitialAvatarUrl] =
    useState(initialAvatarUrl);

  if (initialAvatarUrl !== prevInitialAvatarUrl) {
    setPrevInitialAvatarUrl(initialAvatarUrl);
    setAvatarUrl(initialAvatarUrl);
  }

  const value = useMemo(() => ({ avatarUrl, setAvatarUrl }), [avatarUrl]);

  return (
    <PanelSessionAvatarContext.Provider value={value}>
      {children}
    </PanelSessionAvatarContext.Provider>
  );
}

export function usePanelSessionAvatarUrl(): string | null {
  return useContext(PanelSessionAvatarContext)?.avatarUrl ?? null;
}

/** No-op outside a panel shell. */
export function useSetPanelSessionAvatarUrl(): (
  avatarUrl: string | null,
) => void {
  return (
    useContext(PanelSessionAvatarContext)?.setAvatarUrl ?? (() => undefined)
  );
}

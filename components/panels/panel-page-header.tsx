"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
} from "react";

export type PanelPageHeading = {
  title: string;
};

type SetPanelPageHeading = (heading: PanelPageHeading | null) => void;

const PanelPageHeadingContext = createContext<PanelPageHeading | null>(null);
const SetPanelPageHeadingContext = createContext<SetPanelPageHeading | null>(
  null
);

export function PanelPageHeaderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [heading, setHeading] = useState<PanelPageHeading | null>(null);

  return (
    <SetPanelPageHeadingContext.Provider value={setHeading}>
      <PanelPageHeadingContext.Provider value={heading}>
        {children}
      </PanelPageHeadingContext.Provider>
    </SetPanelPageHeadingContext.Provider>
  );
}

/**
 * Publishes the page title to the panel shell header.
 * Outside a provider (student / teacher navbar shells) it renders inline.
 */
export function PanelPageHeader({ title }: PanelPageHeading) {
  const setHeading = useContext(SetPanelPageHeadingContext);

  useLayoutEffect(() => {
    if (!setHeading) {
      return;
    }
    setHeading({ title });
    return () => setHeading(null);
  }, [setHeading, title]);

  if (setHeading) {
    return null;
  }

  return <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>;
}

/** Shell header slot. Falls back to the matching nav label until a page publishes. */
export function PanelHeaderHeading({ fallbackTitle }: { fallbackTitle: string }) {
  const heading = useContext(PanelPageHeadingContext);
  const title = heading?.title ?? fallbackTitle;

  return (
    <h1
      className="min-w-0 truncate text-sm font-semibold leading-5 text-foreground"
      title={title}
    >
      {title}
    </h1>
  );
}

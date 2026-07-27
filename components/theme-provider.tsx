"use client";

import { usePathname } from "next/navigation";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";
import { isPanelPath } from "@/lib/auth/path-access";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const pathname = usePathname();
  // Marketing/auth stay light regardless of OS preference; panels keep theme toggle.
  const forcedTheme = isPanelPath(pathname) ? undefined : "light";

  // React 19 warns on <script> in client components during hydration.
  // SSR still injects an executable script; on the client we only need
  // a non-executing placeholder (suppressHydrationWarning is on the tag).
  const scriptProps =
    typeof window === "undefined"
      ? undefined
      : ({ type: "application/json" } as const);

  return (
    <NextThemesProvider
      {...props}
      scriptProps={scriptProps}
      forcedTheme={forcedTheme}
    >
      {children}
    </NextThemesProvider>
  );
}

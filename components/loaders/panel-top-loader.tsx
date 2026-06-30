"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function PanelTopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setIsActive(true);

    const completeTimer = window.setTimeout(() => {
      setIsActive(false);
    }, 500);

    return () => {
      window.clearTimeout(completeTimer);
    };
  }, [pathname, searchParams]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-50 h-0.5 overflow-hidden transition-opacity duration-200",
        isActive ? "opacity-100" : "opacity-0"
      )}
      aria-hidden
    >
      <div
        className={cn(
          "panel-top-loader-bar h-full bg-primary",
          isActive && "panel-top-loader-bar-active"
        )}
      />
    </div>
  );
}

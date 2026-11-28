"use client";

import { useEffect, useState } from "react";
import { WifiOffIcon } from "lucide-react";

/**
 * Fixed top strip when the browser reports offline.
 * Remount-safe; does not toast on every flap.
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const sync = () => {
      setIsOffline(!navigator.onLine);
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-amber-600 px-3 py-2 text-center text-sm font-medium text-white shadow-sm"
    >
      <WifiOffIcon className="size-4 shrink-0" aria-hidden />
      <span>
        You are offline. Changes may not save until the connection returns.
      </span>
    </div>
  );
}

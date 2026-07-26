import { useEffect, useState } from "react";

/**
 * Advances through 0..stepCount-1 on an interval while `isPending` is true.
 * Resets to 0 when pending ends. Stays on the last step until pending clears.
 */
export function useStagedPendingProgress(
  isPending: boolean,
  stepCount: number,
  intervalMs = 750
): number {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!isPending || stepCount <= 0) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex(0);

    const timerId = window.setInterval(() => {
      setActiveIndex((current) => Math.min(current + 1, stepCount - 1));
    }, intervalMs);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isPending, stepCount, intervalMs]);

  return activeIndex;
}

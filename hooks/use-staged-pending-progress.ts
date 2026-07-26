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
  const progressKey =
    isPending && stepCount > 0 ? `pending:${stepCount}` : "idle";
  const [trackedKey, setTrackedKey] = useState(progressKey);

  if (progressKey !== trackedKey) {
    setTrackedKey(progressKey);
    setActiveIndex(0);
  }

  useEffect(() => {
    if (!isPending || stepCount <= 0) {
      return;
    }

    const timerId = window.setInterval(() => {
      setActiveIndex((current) => Math.min(current + 1, stepCount - 1));
    }, intervalMs);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isPending, stepCount, intervalMs]);

  if (!isPending || stepCount <= 0) {
    return 0;
  }

  return activeIndex;
}

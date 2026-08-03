import { useEffect, useState } from "react";

/**
 * Simulates an upload progress percent (0–92) while `isActive` is true.
 * Callers should snap to 100 when the real operation finishes.
 */
export function useSimulatedProgressPercent(
  isActive: boolean,
  intervalMs = 100
): number {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setPercent(0);
      return;
    }

    setPercent(6);
    const timerId = window.setInterval(() => {
      setPercent((current) => {
        if (current >= 92) {
          return current;
        }
        const step = Math.max(1, Math.round((92 - current) * 0.12));
        return Math.min(92, current + step);
      });
    }, intervalMs);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isActive, intervalMs]);

  return isActive ? percent : 0;
}

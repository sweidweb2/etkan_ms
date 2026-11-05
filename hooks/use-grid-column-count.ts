"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Live column count of a CSS grid (works with `auto-fill` / container queries).
 * Returns `fallback` until the grid has been measured on the client.
 */
export function useGridColumnCount(
  ref: RefObject<HTMLElement | null>,
  {
    fallback = 1,
    isMounted = true,
  }: {
    fallback?: number;
    /** Pass when the grid renders conditionally so it re-attaches on mount. */
    isMounted?: boolean;
  } = {}
) {
  const [columnCount, setColumnCount] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element || !isMounted) {
      return;
    }

    const measure = () => {
      const template = window.getComputedStyle(element).gridTemplateColumns;
      const count = template.split(" ").filter(Boolean).length;
      setColumnCount(Math.max(1, count));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, isMounted]);

  return columnCount;
}

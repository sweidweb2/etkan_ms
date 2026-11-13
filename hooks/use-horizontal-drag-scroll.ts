"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const NO_PAN_SELECTOR =
  "button, a, input, textarea, select, [role='button'], header, [data-kanban-no-pan]";

function canStartPan(target: EventTarget | null, container: HTMLElement) {
  if (!(target instanceof Element)) {
    return false;
  }
  if (!container.contains(target)) {
    return false;
  }
  if (target.closest(NO_PAN_SELECTOR)) {
    return false;
  }
  return true;
}

function measureOverflow(container: HTMLElement) {
  return container.scrollWidth > container.clientWidth + 1;
}

type UseHorizontalDragScrollOptions = {
  /** When true, pan never starts (e.g. while a kanban card is dragging). */
  disabled?: boolean;
};

/**
 * Click-drag empty areas of an overflow-x container to pan horizontally.
 * Interactive children (cards, headers, buttons) are ignored.
 */
export function useHorizontalDragScroll<T extends HTMLElement>(
  options: UseHorizontalDragScrollOptions = {}
) {
  const { disabled = false } = options;
  const ref = useRef<T | null>(null);
  const [canPan, setCanPan] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
  } | null>(null);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    disabledRef.current = disabled;
    if (disabled && panRef.current) {
      panRef.current = null;
      setIsPanning(false);
    }
  }, [disabled]);

  const updateOverflow = useCallback(() => {
    const node = ref.current;
    if (!node) {
      setCanPan(false);
      return;
    }
    setCanPan(measureOverflow(node));
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    updateOverflow();

    const resizeObserver = new ResizeObserver(() => {
      updateOverflow();
    });
    resizeObserver.observe(node);

    const mutationObserver = new MutationObserver(() => {
      updateOverflow();
    });
    mutationObserver.observe(node, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    window.addEventListener("resize", updateOverflow);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", updateOverflow);
    };
  }, [updateOverflow]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<T>) => {
      const node = ref.current;
      if (!node || !canPan || disabledRef.current || event.button !== 0) {
        return;
      }
      if (!canStartPan(event.target, node)) {
        return;
      }

      panRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startScrollLeft: node.scrollLeft,
      };
      setIsPanning(true);
      node.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [canPan]
  );

  const onPointerMove = useCallback((event: ReactPointerEvent<T>) => {
    const node = ref.current;
    const pan = panRef.current;
    if (!node || !pan || event.pointerId !== pan.pointerId) {
      return;
    }

    const deltaX = event.clientX - pan.startX;
    node.scrollLeft = pan.startScrollLeft - deltaX;
    event.preventDefault();
  }, []);

  const endPan = useCallback((event: ReactPointerEvent<T>) => {
    const node = ref.current;
    const pan = panRef.current;
    if (!pan || event.pointerId !== pan.pointerId) {
      return;
    }

    panRef.current = null;
    setIsPanning(false);
    if (node?.hasPointerCapture(event.pointerId)) {
      node.releasePointerCapture(event.pointerId);
    }
  }, []);

  return {
    ref,
    canPan,
    isPanning,
    scrollProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPan,
      onPointerCancel: endPan,
    },
    refreshOverflow: updateOverflow,
  };
}

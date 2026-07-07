"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SCROLL_STEP_PX = 220;

type HorizontalScrollCarouselProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  navButtonClassName?: string;
  ariaLabel?: string;
};

export function HorizontalScrollCarousel({
  children,
  className,
  contentClassName,
  navButtonClassName,
  ariaLabel = "Horizontally scrollable content",
}: HorizontalScrollCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const updateScrollEdges = useCallback(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    const maxScrollLeft = node.scrollWidth - node.clientWidth;
    setCanScrollLeft(node.scrollLeft > 1);
    setCanScrollRight(node.scrollLeft < maxScrollLeft - 1);
  }, []);

  const scrollByStep = useCallback((direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -SCROLL_STEP_PX : SCROLL_STEP_PX,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    updateScrollEdges();

    const resizeObserver = new ResizeObserver(updateScrollEdges);
    resizeObserver.observe(node);

    node.addEventListener("scroll", updateScrollEdges, { passive: true });

    return () => {
      resizeObserver.disconnect();
      node.removeEventListener("scroll", updateScrollEdges);
    };
  }, [updateScrollEdges, children]);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const node = scrollRef.current;
      const dragState = dragStateRef.current;
      if (!node || !dragState.isDragging) {
        return;
      }

      const deltaX = event.pageX - dragState.startX;
      if (Math.abs(deltaX) > 4) {
        dragState.moved = true;
      }

      node.scrollLeft = dragState.scrollLeft - deltaX;
    };

    const handleMouseUp = () => {
      dragStateRef.current.isDragging = false;
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !scrollRef.current) {
      return;
    }

    dragStateRef.current = {
      isDragging: true,
      startX: event.pageX,
      scrollLeft: scrollRef.current.scrollLeft,
      moved: false,
    };
    setIsDragging(true);
  };

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (dragStateRef.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      dragStateRef.current.moved = false;
    }
  };

  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn("shrink-0", navButtonClassName)}
        disabled={!canScrollLeft}
        onClick={() => scrollByStep("left")}
        aria-label="Scroll tabs left"
      >
        <ChevronLeftIcon />
      </Button>

      <div
        ref={scrollRef}
        aria-label={ariaLabel}
        className={cn(
          "min-w-0 flex-1 overflow-x-auto overscroll-x-contain scroll-smooth select-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          isDragging ? "cursor-grabbing" : "cursor-grab",
          contentClassName
        )}
        onMouseDown={handleMouseDown}
        onClickCapture={handleClickCapture}
        onDragStart={(event) => event.preventDefault()}
      >
        {children}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn("shrink-0", navButtonClassName)}
        disabled={!canScrollRight}
        onClick={() => scrollByStep("right")}
        aria-label="Scroll tabs right"
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}

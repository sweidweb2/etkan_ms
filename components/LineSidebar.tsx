"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import "./LineSidebar.css";

const FALLOFF_CURVES = {
  linear: (p: number) => p,
  smooth: (p: number) => p * p * (3 - 2 * p),
  sharp: (p: number) => p * p * p,
} as const;

export type LineSidebarItem =
  | string
  | {
      label: string;
      id?: string;
      depth?: number;
    };

export type LineSidebarProps = {
  items?: LineSidebarItem[];
  accentColor?: string;
  textColor?: string;
  markerColor?: string;
  showIndex?: boolean;
  showMarker?: boolean;
  proximityRadius?: number;
  maxShift?: number;
  falloff?: keyof typeof FALLOFF_CURVES;
  markerLength?: number;
  markerGap?: number;
  tickScale?: number;
  scaleTick?: boolean;
  itemGap?: number;
  fontSize?: number;
  smoothing?: number;
  defaultActive?: number | null;
  activeIndex?: number | null;
  onItemClick?: (index: number, label: string, item: LineSidebarItem) => void;
  className?: string;
};

const DEFAULT_ITEMS: LineSidebarItem[] = [
  "Overview",
  "Components",
  "Animations",
  "Backgrounds",
  "Showcase",
];

function getItemLabel(item: LineSidebarItem) {
  return typeof item === "string" ? item : item.label;
}

function getItemDepth(item: LineSidebarItem) {
  return typeof item === "string" ? 0 : (item.depth ?? 0);
}

export default function LineSidebar({
  items = DEFAULT_ITEMS,
  accentColor = "#3E3E75",
  textColor = "#8B8BA3",
  markerColor = "#9A9AD0",
  showIndex = true,
  showMarker = true,
  proximityRadius = 100,
  maxShift = 30,
  falloff = "smooth",
  markerLength = 60,
  markerGap = 0,
  tickScale = 0.5,
  scaleTick = true,
  itemGap = 20,
  fontSize = 1.1,
  smoothing = 100,
  defaultActive = null,
  activeIndex: controlledActive,
  onItemClick,
  className = "",
}: LineSidebarProps) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const targetsRef = useRef<number[]>([]);
  const currentRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const activeRef = useRef<number | null>(defaultActive);
  const smoothingRef = useRef(smoothing);
  const [uncontrolledActive, setUncontrolledActive] = useState<number | null>(
    defaultActive
  );

  const activeIndex =
    controlledActive !== undefined ? controlledActive : uncontrolledActive;

  useEffect(() => {
    activeRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    smoothingRef.current = smoothing;
  }, [smoothing]);

  const runFrameRef = useRef<(now: number) => void>(() => {});

  const runFrame = useCallback((now: number) => {
    const dt = Math.min((now - lastRef.current) / 1000, 0.05);
    lastRef.current = now;
    const tau = Math.max(smoothingRef.current, 1) / 1000;
    const k = 1 - Math.exp(-dt / tau);

    let moving = false;
    const nodes = itemRefs.current;
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (!el) continue;
      const target = Math.max(
        targetsRef.current[i] || 0,
        activeRef.current === i ? 1 : 0
      );
      const cur = currentRef.current[i] || 0;
      const next = cur + (target - cur) * k;
      const settled = Math.abs(target - next) < 0.0015;
      const value = settled ? target : next;
      currentRef.current[i] = value;
      el.style.setProperty("--effect", value.toFixed(4));
      if (!settled) moving = true;
    }

    rafRef.current = moving
      ? requestAnimationFrame((time) => runFrameRef.current(time))
      : null;
  }, []);

  useEffect(() => {
    runFrameRef.current = runFrame;
  }, [runFrame]);

  const startLoop = useCallback(() => {
    if (rafRef.current != null) return;
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame((time) => runFrameRef.current(time));
  }, []);

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLUListElement>) => {
      const list = listRef.current;
      if (!list) return;
      const rect = list.getBoundingClientRect();
      const pointerY = e.clientY - rect.top;
      const ease = FALLOFF_CURVES[falloff] ?? FALLOFF_CURVES.linear;
      const nodes = itemRefs.current;
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        if (!el) continue;
        const center = el.offsetTop + el.offsetHeight / 2;
        const distance = Math.abs(pointerY - center);
        targetsRef.current[i] = ease(
          Math.max(0, 1 - distance / proximityRadius)
        );
      }
      startLoop();
    },
    [falloff, proximityRadius, startLoop]
  );

  const handlePointerLeave = useCallback(() => {
    targetsRef.current = targetsRef.current.map(() => 0);
    startLoop();
  }, [startLoop]);

  const handleClick = useCallback(
    (index: number, item: LineSidebarItem) => {
      if (controlledActive === undefined) {
        setUncontrolledActive(index);
      }
      onItemClick?.(index, getItemLabel(item), item);
    },
    [controlledActive, onItemClick]
  );

  useEffect(() => {
    startLoop();
  }, [activeIndex, startLoop]);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  return (
    <nav
      className={`line-sidebar${showMarker ? " line-sidebar--markers" : ""}${scaleTick ? " line-sidebar--scale-tick" : ""}${className ? ` ${className}` : ""}`}
      style={
        {
          "--accent-color": accentColor,
          "--text-color": textColor,
          "--marker-color": markerColor,
          "--marker-length": `${markerLength}px`,
          "--marker-gap": `${markerGap}px`,
          "--tick-scale": tickScale,
          "--max-shift": `${maxShift}px`,
          "--item-gap": `${itemGap}px`,
          "--font-size": `${fontSize}rem`,
          "--smoothing": `${smoothing}ms`,
        } as CSSProperties
      }
    >
      <ul
        ref={listRef}
        className="line-sidebar__list"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {items.map((item, index) => {
          const label = getItemLabel(item);
          const depth = getItemDepth(item);
          const topLevelIndex =
            depth === 0
              ? items
                  .slice(0, index + 1)
                  .filter((entry) => getItemDepth(entry) === 0).length
              : null;
          return (
            <li
              key={`${label}-${index}`}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className="line-sidebar__item"
              data-depth={depth}
              style={{ "--item-depth": depth } as CSSProperties}
              aria-current={activeIndex === index ? "true" : undefined}
              onClick={() => handleClick(index, item)}
            >
              {showMarker ? (
                <span className="line-sidebar__marker" aria-hidden="true" />
              ) : null}
              <span className="line-sidebar__label">
                {showIndex && topLevelIndex != null ? (
                  <span className="line-sidebar__index">
                    {String(topLevelIndex).padStart(2, "0")}
                  </span>
                ) : null}
                {depth > 0 ? (
                  <span className="line-sidebar__branch" aria-hidden="true" />
                ) : null}
                <span className="line-sidebar__text">{label}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

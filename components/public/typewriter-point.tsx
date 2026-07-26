"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type TypewriterPointProps = {
  text: string;
  className?: string;
  /** Hold fully typed text before deleting (ms). */
  holdMs?: number;
  /** Typing speed per character (ms). */
  typeMs?: number;
  /** Deleting speed per character (ms). */
  deleteMs?: number;
};

export function TypewriterPoint({
  text,
  className,
  holdMs = 5000,
  typeMs = 42,
  deleteMs = 28,
}: TypewriterPointProps) {
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting">(
    "typing"
  );

  useEffect(() => {
    setDisplayed("");
    setPhase("typing");
  }, [text]);

  useEffect(() => {
    if (!text) return;

    if (phase === "typing") {
      if (displayed.length >= text.length) {
        const holdTimer = window.setTimeout(() => setPhase("deleting"), holdMs);
        return () => window.clearTimeout(holdTimer);
      }
      const timer = window.setTimeout(() => {
        setDisplayed(text.slice(0, displayed.length + 1));
      }, typeMs);
      return () => window.clearTimeout(timer);
    }

    if (phase === "deleting") {
      if (displayed.length === 0) {
        setPhase("typing");
        return;
      }
      const timer = window.setTimeout(() => {
        setDisplayed(text.slice(0, displayed.length - 1));
      }, deleteMs);
      return () => window.clearTimeout(timer);
    }
  }, [displayed, deleteMs, holdMs, phase, text, typeMs]);

  return (
    <span
      className={cn(
        "relative inline bg-gradient-to-r from-sky-700/15 via-slate-700/10 to-transparent box-decoration-clone px-1.5 py-0.5",
        "font-semibold text-slate-900 underline decoration-sky-600/50 decoration-2 underline-offset-4",
        className
      )}
      aria-label={text}
    >
      <span suppressHydrationWarning>{displayed}</span>
      <span
        aria-hidden="true"
        className="ms-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.12em] animate-pulse bg-sky-700 align-baseline"
      />
    </span>
  );
}

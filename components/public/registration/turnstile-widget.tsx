"use client";

import {
  useEffect,
  useImperativeHandle,
  useRef,
  type Ref,
} from "react";
import Script from "next/script";
import {
  TURNSTILE_REGISTER_ACTION,
  TURNSTILE_SCRIPT_SRC,
} from "@/lib/constants/turnstile";

interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  theme?: "auto" | "light" | "dark";
  size?: "normal" | "flexible" | "compact";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
}

interface TurnstileApi {
  render: (
    container: HTMLElement | string,
    options: TurnstileRenderOptions
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export interface TurnstileWidgetHandle {
  reset: () => void;
}

interface TurnstileWidgetProps {
  siteKey: string;
  action?: string;
  onTokenChange: (token: string) => void;
  ref?: Ref<TurnstileWidgetHandle>;
}

export function TurnstileWidget({
  siteKey,
  action = TURNSTILE_REGISTER_ACTION,
  onTokenChange,
  ref,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenChangeRef = useRef(onTokenChange);

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);

  useImperativeHandle(ref, () => ({
    reset() {
      onTokenChangeRef.current("");
      const widgetId = widgetIdRef.current;
      if (widgetId && window.turnstile) {
        window.turnstile.reset(widgetId);
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;
    let pollId: number | null = null;

    function tryRender(): boolean {
      if (cancelled || widgetIdRef.current || !containerRef.current) {
        return Boolean(widgetIdRef.current);
      }
      if (!window.turnstile) {
        return false;
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        theme: "auto",
        size: "flexible",
        callback: (token) => onTokenChangeRef.current(token),
        "expired-callback": () => onTokenChangeRef.current(""),
        "error-callback": () => onTokenChangeRef.current(""),
      });
      return true;
    }

    if (!tryRender()) {
      pollId = window.setInterval(() => {
        if (tryRender() && pollId !== null) {
          window.clearInterval(pollId);
          pollId = null;
        }
      }, 50);
    }

    return () => {
      cancelled = true;
      if (pollId !== null) {
        window.clearInterval(pollId);
      }
      const widgetId = widgetIdRef.current;
      widgetIdRef.current = null;
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
      onTokenChangeRef.current("");
    };
  }, [action, siteKey]);

  return (
    <div className="space-y-2">
      <Script src={TURNSTILE_SCRIPT_SRC} strategy="afterInteractive" />
      <div ref={containerRef} className="flex min-h-[65px] justify-start" />
    </div>
  );
}

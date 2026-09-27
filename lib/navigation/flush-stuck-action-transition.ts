"use client";

function isNextActionRequest(
  input: RequestInfo | URL,
  init?: RequestInit
): boolean {
  const requestHeaders = input instanceof Request ? input.headers : undefined;
  const headers = new Headers(init?.headers ?? requestHeaders);
  return headers.has("Next-Action") || headers.has("next-action");
}

/**
 * Production Next.js often receives the server-action response but does not
 * commit the transition until a discrete user event (any click). Synthesize
 * that event so the dialog can close without a real click.
 */
export function flushStuckActionTransition() {
  if (typeof document === "undefined") {
    return;
  }

  const el = document.createElement("button");
  el.type = "button";
  el.tabIndex = -1;
  el.setAttribute("aria-hidden", "true");
  el.style.cssText =
    "position:fixed;left:0;top:0;width:1px;height:1px;margin:0;padding:0;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(el);
  try {
    el.click();
  } finally {
    el.remove();
  }
}

let fetchPatched = false;

/** When a server-action fetch finishes, poke React to commit the result. */
export function ensureActionTransitionFlushOnFetch() {
  if (fetchPatched || typeof window === "undefined") {
    return;
  }

  fetchPatched = true;
  const inner = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const isAction = isNextActionRequest(input, init);
    const result = inner(input, init);

    if (!isAction) {
      return result;
    }

    return Promise.resolve(result).then(
      (response) => {
        queueMicrotask(flushStuckActionTransition);
        setTimeout(flushStuckActionTransition, 0);
        setTimeout(flushStuckActionTransition, 32);
        return response;
      },
      (error: unknown) => {
        flushStuckActionTransition();
        throw error;
      }
    );
  }) as typeof fetch;
}

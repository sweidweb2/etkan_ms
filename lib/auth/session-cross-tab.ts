import { ROUTES } from "@/lib/constants/routes";
import { TOAST_QUERY_KEYS } from "@/lib/constants/toast-messages";
import { appendQueryParam } from "@/lib/url/append-query-param";

export type SessionEndedReason = "signed_out" | "session_expired";

export type SessionCrossTabMessage =
  | { type: "session_ended"; reason: SessionEndedReason }
  | { type: "activity" };

export const SESSION_CROSS_TAB_CHANNEL = "etkan-ms-session";
export const SESSION_CROSS_TAB_STORAGE_KEY = "etkan-ms-session-ended";

function canUseBrowserApis(): boolean {
  return typeof window !== "undefined";
}

function parseSessionEndedReason(value: unknown): SessionEndedReason | null {
  if (value === "signed_out" || value === "session_expired") {
    return value;
  }
  return null;
}

export function parseSessionCrossTabMessage(
  raw: unknown
): SessionCrossTabMessage | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const message = raw as { type?: unknown; reason?: unknown };

  if (message.type === "activity") {
    return { type: "activity" };
  }

  if (message.type === "session_ended") {
    const reason = parseSessionEndedReason(message.reason);
    if (!reason) {
      return null;
    }
    return { type: "session_ended", reason };
  }

  return null;
}

export function parseSessionEndedStorageValue(
  raw: string | null
): SessionEndedReason | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parseSessionEndedReason((parsed as { reason?: unknown }).reason);
  } catch {
    return null;
  }
}

export function loginUrlForSessionEnded(reason: SessionEndedReason): string {
  if (reason === "session_expired") {
    return appendQueryParam(
      ROUTES.LOGIN,
      TOAST_QUERY_KEYS.info,
      "session_expired"
    );
  }

  return appendQueryParam(
    ROUTES.LOGIN,
    TOAST_QUERY_KEYS.success,
    "signed_out"
  );
}

function postToBroadcastChannel(message: SessionCrossTabMessage): void {
  if (!canUseBrowserApis() || typeof BroadcastChannel === "undefined") {
    return;
  }

  try {
    const channel = new BroadcastChannel(SESSION_CROSS_TAB_CHANNEL);
    channel.postMessage(message);
    channel.close();
  } catch {
    // Ignore environments without BroadcastChannel support.
  }
}

/** Notify other tabs that this tab ended the session (logout or idle). */
export function broadcastSessionEnded(reason: SessionEndedReason): void {
  if (!canUseBrowserApis()) {
    return;
  }

  const message: SessionCrossTabMessage = { type: "session_ended", reason };
  postToBroadcastChannel(message);

  try {
    localStorage.setItem(
      SESSION_CROSS_TAB_STORAGE_KEY,
      JSON.stringify({ reason, at: Date.now() })
    );
  } catch {
    // Private mode / disabled storage — BroadcastChannel may still work.
  }
}

/** Notify other tabs of user activity so shared idle timers stay aligned. */
export function broadcastSessionActivity(): void {
  postToBroadcastChannel({ type: "activity" });
}

type SessionCrossTabHandlers = {
  onSessionEnded?: (reason: SessionEndedReason) => void;
  onActivity?: () => void;
};

/**
 * Subscribe to cross-tab session signals.
 * Same-tab senders do not receive their own BroadcastChannel/storage events.
 */
export function subscribeSessionCrossTab(
  handlers: SessionCrossTabHandlers
): () => void {
  if (!canUseBrowserApis()) {
    return () => undefined;
  }

  let channel: BroadcastChannel | null = null;

  const handleMessage = (raw: unknown) => {
    const message = parseSessionCrossTabMessage(raw);
    if (!message) {
      return;
    }

    if (message.type === "session_ended") {
      handlers.onSessionEnded?.(message.reason);
      return;
    }

    handlers.onActivity?.();
  };

  if (typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel(SESSION_CROSS_TAB_CHANNEL);
      channel.onmessage = (event: MessageEvent<unknown>) => {
        handleMessage(event.data);
      };
    } catch {
      channel = null;
    }
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== SESSION_CROSS_TAB_STORAGE_KEY || event.newValue == null) {
      return;
    }

    const reason = parseSessionEndedStorageValue(event.newValue);
    if (reason) {
      handlers.onSessionEnded?.(reason);
    }
  };

  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.close();
  };
}

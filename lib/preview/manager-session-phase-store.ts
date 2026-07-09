import type { ManagerSessionPhaseLink } from "@/types/manager-session-phase-link";

const STORAGE_KEY = "etkan_ms_preview_session_phase_links";

type StoredSessionPhaseLinks = Record<string, ManagerSessionPhaseLink>;

function readStore(): StoredSessionPhaseLinks {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as StoredSessionPhaseLinks;
  } catch {
    return {};
  }
}

function writeStore(store: StoredSessionPhaseLinks) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getPreviewSessionPhaseLinkFromStore(
  sessionId: string
): ManagerSessionPhaseLink | null {
  return readStore()[sessionId] ?? null;
}

export function setPreviewSessionPhaseLink(
  sessionId: string,
  link: ManagerSessionPhaseLink
) {
  const store = readStore();
  store[sessionId] = link;
  writeStore(store);
}

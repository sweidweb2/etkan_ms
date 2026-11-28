/**
 * Process-wide pending mutation counter for leave/refresh warnings.
 * Used by form actions and imperative mutation UIs (grades compute, etc.).
 */

let pendingCount = 0;
let beforeUnloadBound = false;

const CONFIRM_MESSAGE =
  "A save is still in progress. Leave this page and risk losing the change?";

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (pendingCount <= 0) {
    return;
  }
  event.preventDefault();
  event.returnValue = CONFIRM_MESSAGE;
}

function onDocumentClickCapture(event: MouseEvent) {
  if (pendingCount <= 0 || event.defaultPrevented) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) {
    return;
  }

  if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
    return;
  }

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:")) {
    return;
  }

  // Same-page hash / javascript: ignore
  if (href.startsWith("javascript:")) {
    return;
  }

  const leave = window.confirm(CONFIRM_MESSAGE);
  if (!leave) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function ensureListeners() {
  if (beforeUnloadBound || typeof window === "undefined") {
    return;
  }
  beforeUnloadBound = true;
  window.addEventListener("beforeunload", onBeforeUnload);
  document.addEventListener("click", onDocumentClickCapture, true);
}

function tearDownListenersIfIdle() {
  if (pendingCount > 0 || !beforeUnloadBound || typeof window === "undefined") {
    return;
  }
  beforeUnloadBound = false;
  window.removeEventListener("beforeunload", onBeforeUnload);
  document.removeEventListener("click", onDocumentClickCapture, true);
}

/** Mark one in-flight mutation. Pair with `releasePendingMutation`. */
export function acquirePendingMutation() {
  pendingCount += 1;
  ensureListeners();
}

/** Clear one in-flight mutation when it settles or the owner unmounts. */
export function releasePendingMutation() {
  pendingCount = Math.max(0, pendingCount - 1);
  tearDownListenersIfIdle();
}

export function getPendingMutationCount() {
  return pendingCount;
}

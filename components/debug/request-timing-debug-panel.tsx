import {
  getTimingReport,
  isRequestTimingEnabled,
} from "@/lib/debug/request-timing";

/** Dev-only on-page dump of server request timing marks. */
export function RequestTimingDebugPanel({ title }: { title: string }) {
  if (!isRequestTimingEnabled()) {
    return null;
  }

  const report = getTimingReport();
  if (!report) {
    return null;
  }

  return (
    <aside
      className="mt-6 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 font-mono text-[11px] leading-relaxed text-amber-950 dark:text-amber-100"
      data-testid="request-timing-debug"
    >
      <p className="mb-2 font-sans text-xs font-semibold tracking-wide">
        Timing debug — {title} (dev only)
      </p>
      <pre className="overflow-x-auto whitespace-pre-wrap">{report.lines.join("\n")}</pre>
    </aside>
  );
}

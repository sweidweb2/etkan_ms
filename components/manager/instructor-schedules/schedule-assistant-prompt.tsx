"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  LoaderCircleIcon,
  SparklesIcon,
  WrenchIcon,
  BrainIcon,
  MessageSquareTextIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH,
  SCHEDULE_ASSISTANT_REFUSAL_MESSAGE,
} from "@/lib/constants/schedule-assistant";
import { cn } from "@/lib/utils";
import type { ScheduleAssistantSseEvent } from "@/types/schedule-assistant";

type Phase = "idle" | "reasoning" | "tools" | "answering" | "done" | "error";

type ToolLogItem = {
  name: string;
  summary?: string;
  pending: boolean;
};

export function ScheduleAssistantPrompt() {
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [reasoningLines, setReasoningLines] = useState<string[]>([]);
  const [toolLog, setToolLog] = useState<ToolLogItem[]>([]);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const remaining = SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH - prompt.length;
  const busy = isPending || phase === "reasoning" || phase === "tools" || phase === "answering";

  function resetOutput() {
    setReasoningLines([]);
    setToolLog([]);
    setAnswer("");
    setError(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || busy) {
      return;
    }

    resetOutput();
    setPhase("reasoning");

    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/manager/instructor-schedules/assistant",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: trimmed }),
          }
        );

        if (!response.ok || !response.body) {
          const payload = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(
            payload?.message ?? "Unable to reach the schedule assistant."
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part
              .split("\n")
              .map((entry) => entry.trim())
              .find((entry) => entry.startsWith("data:"));
            if (!line) {
              continue;
            }
            const jsonText = line.slice(5).trim();
            if (!jsonText) {
              continue;
            }

            let event: ScheduleAssistantSseEvent;
            try {
              event = JSON.parse(jsonText) as ScheduleAssistantSseEvent;
            } catch {
              continue;
            }

            if (event.type === "reasoning") {
              setPhase("reasoning");
              setReasoningLines((current) => [...current, event.text]);
            } else if (event.type === "tool_start") {
              setPhase("tools");
              setToolLog((current) => [
                ...current,
                { name: event.name, pending: true },
              ]);
            } else if (event.type === "tool_result") {
              setPhase("tools");
              setToolLog((current) => {
                const next = [...current];
                const index = [...next]
                  .reverse()
                  .findIndex(
                    (item) => item.name === event.name && item.pending
                  );
                if (index === -1) {
                  next.push({
                    name: event.name,
                    summary: event.summary,
                    pending: false,
                  });
                  return next;
                }
                const realIndex = next.length - 1 - index;
                next[realIndex] = {
                  name: event.name,
                  summary: event.summary,
                  pending: false,
                };
                return next;
              });
            } else if (event.type === "token") {
              setPhase("answering");
              setAnswer((current) => current + event.text);
            } else if (event.type === "refused") {
              setPhase("done");
              setAnswer(event.message || SCHEDULE_ASSISTANT_REFUSAL_MESSAGE);
            } else if (event.type === "error") {
              setPhase("error");
              setError(event.message);
            } else if (event.type === "done") {
              setPhase((current) =>
                current === "error" ? "error" : "done"
              );
            }
          }
        }

        setPhase((current) => (current === "error" ? "error" : "done"));
      } catch (submitError) {
        setPhase("error");
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to run the schedule assistant."
        );
      }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-400">
          <SparklesIcon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold tracking-tight">
            Schedule assistant
          </h2>
          <p className="text-xs text-muted-foreground">
            Ask for instructors by subject and free weekdays. Max{" "}
            {SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH} characters.
          </p>
        </div>
      </div>

      <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
        <textarea
          value={prompt}
          onChange={(event) =>
            setPrompt(
              event.target.value.slice(0, SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH)
            )
          }
          placeholder='e.g. "Arduino instructors free on Tuesday and Friday"'
          rows={2}
          disabled={busy}
          maxLength={SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH}
          className="min-h-18 w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
        />
        <div className="flex items-center justify-between gap-3">
          <p
            className={cn(
              "text-xs tabular-nums text-muted-foreground",
              remaining <= 30 && "text-amber-700 dark:text-amber-400"
            )}
          >
            {prompt.length}/{SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH}
          </p>
          <Button type="submit" size="sm" disabled={busy || !prompt.trim()}>
            {busy ? <LoaderCircleIcon className="animate-spin" /> : null}
            Ask
          </Button>
        </div>
      </form>

      {phase !== "idle" ? (
        <div className="flex flex-col gap-3 border-t pt-3">
          <div className="flex flex-wrap gap-2">
            <PhaseChip
              active={phase === "reasoning"}
              done={
                phase === "tools" ||
                phase === "answering" ||
                phase === "done"
              }
              icon={BrainIcon}
              label="Reasoning"
            />
            <PhaseChip
              active={phase === "tools"}
              done={phase === "answering" || phase === "done"}
              icon={WrenchIcon}
              label="Tool calling"
            />
            <PhaseChip
              active={phase === "answering"}
              done={phase === "done"}
              icon={MessageSquareTextIcon}
              label="Answering"
            />
          </div>

          {phase === "reasoning" && reasoningLines.length > 0 ? (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <p className="leading-relaxed">
                {reasoningLines[reasoningLines.length - 1]}
              </p>
            </div>
          ) : null}

          {phase === "tools" && toolLog.length > 0 ? (
            <ul className="flex flex-col gap-1.5 text-xs">
              {toolLog.map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  {item.pending ? (
                    <LoaderCircleIcon className="size-3.5 animate-spin" />
                  ) : (
                    <WrenchIcon className="size-3.5" />
                  )}
                  <span className="font-medium text-foreground">{item.name}</span>
                  {item.summary ? <span>— {item.summary}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}

          {(phase === "answering" || phase === "done") && answer ? (
            <div className="whitespace-pre-wrap rounded-lg border bg-background px-3 py-2 text-sm leading-relaxed">
              {answer}
              {phase === "answering" ? (
                <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-foreground/70 align-text-bottom" />
              ) : null}
            </div>
          ) : null}

          {phase === "error" && error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function PhaseChip({
  active,
  done,
  icon: Icon,
  label,
}: {
  active: boolean;
  done: boolean;
  icon: typeof BrainIcon;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        active &&
          "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        done && !active && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        !active && !done && "border-border text-muted-foreground"
      )}
    >
      <Icon className={cn("size-3", active && "animate-pulse")} />
      {label}
    </span>
  );
}

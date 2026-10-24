"use client";

import { useTeacherTaskAnalytics } from "@/hooks/use-teacher-task-analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/** Teacher layout preferences persisted in the browser. */
export function TeacherSettingsLayoutPanel() {
  const { enabled, setEnabled, hasHydrated } = useTeacherTaskAnalytics();

  return (
    <Card className="border-border/70 bg-card shadow-[0_10px_28px_-24px_rgba(62,62,117,0.22)]">
      <CardHeader className="border-b border-border/50 bg-muted/25 pb-3">
        <CardTitle className="text-base">Layout</CardTitle>
        <CardDescription>
          Control what appears on your class pages. Saved in this browser only.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3">
          <div className="min-w-0 space-y-1">
            <Label htmlFor="teacher-task-analytics" className="text-sm font-medium">
              Task analytics
            </Label>
            <p className="text-xs text-muted-foreground">
              Show grade summary cards on the class Tasks tab.
            </p>
          </div>
          <Switch
            id="teacher-task-analytics"
            checked={enabled}
            disabled={!hasHydrated}
            onCheckedChange={setEnabled}
            aria-label="Task analytics"
          />
        </div>
      </CardContent>
    </Card>
  );
}

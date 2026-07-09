"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  BellIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  Clock3Icon,
  UsersIcon,
} from "lucide-react";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MANAGER_DASHBOARD_ACTIVITY_MOCK,
  MANAGER_DASHBOARD_ALERTS_MOCK,
  MANAGER_DASHBOARD_QUICK_ACTIONS_MOCK,
  MANAGER_DASHBOARD_SCHEDULE_MOCK,
  MANAGER_DASHBOARD_STATS_MOCK,
} from "@/lib/constants/manager-dashboard-mock";
import { cn } from "@/lib/utils";

const SCHEDULE_STATUS_STYLES = {
  upcoming: "bg-sky-500",
  in_progress: "bg-emerald-500",
  completed: "bg-muted-foreground/60",
} as const;

function DashboardSectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function ManagerDashboardPanel() {
  return (
    <div className="flex flex-col gap-6">
      <DashboardSectionHeader
        title="Manager dashboard"
        description="Daily overview of students, classes, schedule, and operational follow-ups."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {MANAGER_DASHBOARD_STATS_MOCK.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-2">
            <UserStatCard
              label={stat.label}
              value={stat.value}
              accentClassName={stat.accentClassName}
            />
            <p className="px-1 text-xs text-muted-foreground">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="py-0">
          <CardHeader className="border-b bg-muted/40 py-4">
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>
              Jump into the sections managers use most often.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 px-4 py-4 sm:grid-cols-2">
            {MANAGER_DASHBOARD_QUICK_ACTIONS_MOCK.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{action.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="border-b bg-muted/40 py-4">
            <CardTitle>Priority queue</CardTitle>
            <CardDescription>
              Items that likely need manager attention today.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-4 py-4">
            {MANAGER_DASHBOARD_ALERTS_MOCK.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-amber-500/10 p-2 text-amber-600">
                    <CircleAlertIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-medium">{alert.title}</p>
                      <span className="text-sm font-semibold tabular-nums">
                        {alert.value}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {alert.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Card className="py-0">
          <CardHeader className="border-b bg-muted/40 py-4">
            <CardTitle>Today&apos;s schedule</CardTitle>
            <CardDescription>
              Snapshot of active and upcoming classes for today.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 py-4">
            <div className="space-y-3">
              {MANAGER_DASHBOARD_SCHEDULE_MOCK.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 rounded-xl border p-4"
                >
                  <div
                    className={cn(
                      "mt-1 size-2.5 shrink-0 rounded-full",
                      SCHEDULE_STATUS_STYLES[item.status]
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium">{item.title}</p>
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock3Icon className="size-3.5" />
                        {item.time}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.meta}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="border-b bg-muted/40 py-4">
            <CardTitle>At a glance</CardTitle>
            <CardDescription>
              Fast operational context for the rest of the day.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 px-4 py-4">
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-sky-500/10 p-2 text-sky-600">
                  <UsersIcon className="size-4" />
                </div>
                <div>
                  <p className="font-medium">Enrollment trend</p>
                  <p className="text-sm text-muted-foreground">
                    18 new student applications in the last 7 days.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-violet-500/10 p-2 text-violet-600">
                  <BookOpenIcon className="size-4" />
                </div>
                <div>
                  <p className="font-medium">Academic coverage</p>
                  <p className="text-sm text-muted-foreground">
                    11 subjects have at least one active class this week.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600">
                  <CalendarDaysIcon className="size-4" />
                </div>
                <div>
                  <p className="font-medium">Schedule health</p>
                  <p className="text-sm text-muted-foreground">
                    No room conflicts detected for today&apos;s classes.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="py-0">
          <CardHeader className="border-b bg-muted/40 py-4">
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              Latest updates from students, subjects, payments, and relationships.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 py-4">
            <div className="space-y-4">
              {MANAGER_DASHBOARD_ACTIVITY_MOCK.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="mt-1 rounded-full bg-muted p-2 text-muted-foreground">
                    <CircleCheckIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{item.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {item.time}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="border-b bg-muted/40 py-4">
            <CardTitle>System shortcuts</CardTitle>
            <CardDescription>
              Reach common manager tools from one place.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-4 py-4">
            <Link
              href="/manager/notifications"
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "justify-start"
              )}
            >
              <BellIcon data-icon="inline-start" />
              Open notifications
            </Link>
            <Link
              href="/manager/reports"
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "justify-start"
              )}
            >
              <BookOpenIcon data-icon="inline-start" />
              View reports
            </Link>
            <Link
              href="/manager/settings"
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "justify-start"
              )}
            >
              <CalendarDaysIcon data-icon="inline-start" />
              Panel settings
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { LayoutTemplateIcon, UserIcon } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsContents,
} from "@/components/animate-ui/components/animate/tabs";
import {
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { TeacherSettingsLayoutPanel } from "@/components/teacher/settings/teacher-settings-layout-panel";
import { TeacherSettingsPasswordForm } from "@/components/teacher/settings/teacher-settings-password-form";
import { TeacherSettingsProfileForm } from "@/components/teacher/settings/teacher-settings-profile-form";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { TeacherSelfProfile } from "@/services/auth/teacher-account-self.service";

const SECTIONS = {
  MY_INFO: "my-info",
  LAYOUT: "layout",
} as const;

type SettingsSection = (typeof SECTIONS)[keyof typeof SECTIONS];

const SETTINGS_NAV = [
  {
    value: SECTIONS.MY_INFO,
    label: "My info",
    description: "Name, username, email, password",
    icon: UserIcon,
  },
  {
    value: SECTIONS.LAYOUT,
    label: "Layout",
    description: "Class page display options",
    icon: LayoutTemplateIcon,
  },
] as const;

type TeacherSettingsPanelProps = {
  profile: TeacherSelfProfile;
};

/**
 * Single-page teacher settings: client section switching (no route hops).
 */
export function TeacherSettingsPanel({
  profile: initialProfile,
}: TeacherSettingsPanelProps) {
  const [section, setSection] = useState<SettingsSection>(SECTIONS.MY_INFO);
  const [profile, setProfile] = useState(initialProfile);

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.TEACHER_CLASSES} prefetch={false}>
              My classes
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and how class pages look.
        </p>
      </div>

      {/* 60 background · 30 muted rail/cards · 10 primary accents */}
      <Tabs
        value={section}
        onValueChange={(value) => setSection(value as SettingsSection)}
        className="flex flex-col gap-6 md:flex-row md:items-start"
      >
        <aside className="w-full shrink-0 md:sticky md:top-4 md:w-60">
          <TabsListPrimitive
            aria-label="Settings"
            className="flex w-full flex-row gap-1 rounded-2xl border border-border/80 bg-secondary/80 p-1.5 md:flex-col"
          >
            {SETTINGS_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTriggerPrimitive
                  key={item.value}
                  value={item.value}
                  className={cn(
                    "group relative flex w-full items-start gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-left transition-colors",
                    "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    "text-muted-foreground hover:bg-card/80 hover:text-foreground",
                    "data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border"
                  )}
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-transparent transition-colors group-data-[state=active]:bg-primary"
                  />
                  <span
                    className={cn(
                      "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent bg-card/70 text-muted-foreground transition-colors",
                      "group-data-[state=active]:border-primary/25 group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary"
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="mt-0.5 hidden text-xs text-muted-foreground group-data-[state=active]:text-primary/70 md:block">
                      {item.description}
                    </span>
                  </span>
                </TabsTriggerPrimitive>
              );
            })}
          </TabsListPrimitive>
        </aside>

        <div className="min-w-0 flex-1">
          <TabsContents className="mx-0">
            <TabsContent value={SECTIONS.MY_INFO} className="outline-none">
              <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                <TeacherSettingsProfileForm
                  profile={profile}
                  onProfileUpdated={setProfile}
                />
                <TeacherSettingsPasswordForm />
              </div>
            </TabsContent>

            <TabsContent value={SECTIONS.LAYOUT} className="outline-none">
              <TeacherSettingsLayoutPanel />
            </TabsContent>
          </TabsContents>
        </div>
      </Tabs>
    </div>
  );
}

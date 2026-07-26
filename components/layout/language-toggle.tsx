"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LOCALES, type Locale } from "@/lib/i18n/locales";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { setPublicLocaleAction } from "@/lib/i18n/set-public-locale";
import { cn } from "@/lib/utils";

type LanguageToggleProps = {
  className?: string;
};

export function LanguageToggle({ className }: LanguageToggleProps) {
  const router = useRouter();
  const { locale, t } = usePublicI18n();
  const [isPending, startTransition] = useTransition();

  function selectLocale(next: Locale) {
    if (next === locale || isPending) {
      return;
    }

    startTransition(async () => {
      await setPublicLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-background p-0.5",
        className
      )}
      role="group"
      aria-label={t("nav.language")}
    >
      {LOCALES.map((option) => {
        const isActive = option === locale;
        return (
          <Button
            key={option}
            type="button"
            size="xs"
            variant={isActive ? "secondary" : "ghost"}
            disabled={isPending}
            aria-pressed={isActive}
            className={cn(
              "min-w-8 px-2",
              isActive ? "shadow-sm" : "text-muted-foreground"
            )}
            onClick={() => selectLocale(option)}
          >
            {option === "en" ? t("language.en") : t("language.ar")}
          </Button>
        );
      })}
    </div>
  );
}

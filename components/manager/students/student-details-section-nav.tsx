"use client";

import type { ComponentType } from "react";
import {
  BookOpenIcon,
  PackageIcon,
  WalletIcon,
} from "lucide-react";
import {
  scrollToStudentDetailsSection,
  STUDENT_DETAILS_SECTION_IDS,
} from "@/lib/constants/student-details-sections";
import { cn } from "@/lib/utils";

type NavCardConfig = {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  themeClassName: string;
  iconClassName: string;
  disabled?: boolean;
};

const NAV_CARDS: NavCardConfig[] = [
  {
    id: STUDENT_DETAILS_SECTION_IDS.classes,
    label: "Classes",
    description: "Joined classes and class details",
    icon: BookOpenIcon,
    themeClassName:
      "bg-sky-100/90 ring-sky-200/80 hover:bg-sky-100 dark:bg-sky-950/40 dark:ring-sky-800/60 dark:hover:bg-sky-950/55",
    iconClassName: "bg-sky-200/70 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300",
  },
  {
    id: STUDENT_DETAILS_SECTION_IDS.borrowing,
    label: "Borrowing",
    description: "Borrowed equipment records",
    icon: PackageIcon,
    themeClassName:
      "bg-violet-100/90 ring-violet-200/80 hover:bg-violet-100 dark:bg-violet-950/40 dark:ring-violet-800/60 dark:hover:bg-violet-950/55",
    iconClassName:
      "bg-violet-200/70 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300",
  },
  {
    id: STUDENT_DETAILS_SECTION_IDS.account,
    label: "Account",
    description: "Finance and account overview",
    icon: WalletIcon,
    themeClassName:
      "bg-amber-100/70 ring-amber-200/70 dark:bg-amber-950/30 dark:ring-amber-900/50",
    iconClassName:
      "bg-amber-200/60 text-amber-700/80 dark:bg-amber-900/50 dark:text-amber-400/80",
    disabled: true,
  },
];

export function StudentDetailsSectionNav() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {NAV_CARDS.map((card) => {
        const Icon = card.icon;

        return (
          <button
            key={card.id}
            type="button"
            disabled={card.disabled}
            onClick={() => scrollToStudentDetailsSection(card.id)}
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-xl p-4 text-left ring-1 transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              card.themeClassName,
              card.disabled
                ? "cursor-not-allowed opacity-60"
                : "hover:-translate-y-0.5 hover:shadow-sm"
            )}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                card.iconClassName
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">
                {card.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {card.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

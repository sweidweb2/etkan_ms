"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { ROUTES } from "@/lib/constants/routes";

export default function MaintenancePage() {
  const { t } = usePublicI18n();

  return (
    <div className="flex flex-1 items-center justify-center p-4 pt-24">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("maintenance.title")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("maintenance.description")}
            </p>
          </div>

          <div className="text-sm" suppressHydrationWarning>
            {t("maintenance.managerHint")}{" "}
            <Link
              className="underline"
              href={ROUTES.MANAGER_SETTINGS}
              suppressHydrationWarning
            >
              {t("maintenance.settingsLink")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

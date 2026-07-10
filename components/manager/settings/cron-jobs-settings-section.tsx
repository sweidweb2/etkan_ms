import Link from "next/link";
import { ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";

export function CronJobsSettingsSection() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Cron jobs</CardTitle>
        <CardDescription>
          View the read-only catalog of scheduled database jobs, including
          schedules and what each job updates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          render={<Link href={ROUTES.MANAGER_CRON_JOBS} />}
          nativeButton={false}
        >
          <ClockIcon data-icon="inline-start" />
          View cron jobs
        </Button>
      </CardContent>
    </Card>
  );
}

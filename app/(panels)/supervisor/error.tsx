"use client";

import { ErrorPage } from "@/components/errors/error-page";
import { ROUTES } from "@/lib/constants/routes";

export default function SupervisorError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      title="Supervisor panel error"
      description="Something went wrong in the supervisor panel."
      reset={reset}
      homeHref={ROUTES.MANAGER_STUDENTS}
      homeLabel="Back to students"
    />
  );
}

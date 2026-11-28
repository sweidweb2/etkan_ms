"use client";

import { ErrorPage } from "@/components/errors/error-page";
import { ROUTES } from "@/lib/constants/routes";

export default function StudentError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      title="Student panel error"
      description="Something went wrong in the student panel."
      reset={reset}
      homeHref={ROUTES.STUDENT_ROOT}
      homeLabel="Back to home"
    />
  );
}

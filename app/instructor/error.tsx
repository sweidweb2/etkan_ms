"use client";

import { ErrorPage } from "@/components/errors/error-page";
import { ROUTES } from "@/lib/constants/routes";

export default function InstructorError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      title="Something went wrong"
      description="Something went wrong on this instructor page."
      reset={reset}
      homeHref={ROUTES.INSTRUCTOR_DASHBOARD}
      homeLabel="Back to overview"
    />
  );
}

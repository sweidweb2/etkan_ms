"use client";

import { ErrorPage } from "@/components/errors/error-page";
import { ROUTES } from "@/lib/constants/routes";

export default function TeacherError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      title="Teacher panel error"
      description="Something went wrong in the teacher panel."
      reset={reset}
      homeHref={ROUTES.TEACHER_CLASSES}
      homeLabel="Back to classes"
    />
  );
}

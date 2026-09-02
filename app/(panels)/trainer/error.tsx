"use client";

import { ErrorPage } from "@/components/errors/error-page";
import { ROUTES } from "@/lib/constants/routes";

export default function TrainerError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      title="Trainer panel error"
      description="Something went wrong in the trainer panel."
      reset={reset}
      homeHref={ROUTES.MANAGER_WORKSHOPS}
      homeLabel="Back to workshops"
    />
  );
}

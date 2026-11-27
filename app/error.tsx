"use client";

import { useEffect } from "react";
import { ErrorPage } from "@/components/errors/error-page";
import { logOpsError } from "@/lib/ops/logger";

type RootErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    logOpsError("app/error", error, { digest: error.digest });
  }, [error]);

  return (
    <ErrorPage
      title="Something went wrong"
      description={
        error.message ||
        "An unexpected error occurred. You can try again or return home."
      }
      reset={reset}
    />
  );
}

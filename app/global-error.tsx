"use client";

import { useEffect } from "react";
import { ErrorPage } from "@/components/errors/error-page";
import { logOpsError } from "@/lib/ops/logger";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    logOpsError("app/global-error", error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ErrorPage
          title="Something went wrong"
          description={
            error.message ||
            "An unexpected error occurred. You can try again or return home."
          }
          reset={reset}
        />
      </body>
    </html>
  );
}

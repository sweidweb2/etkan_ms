"use client";

import { ErrorPage } from "@/components/errors/error-page";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
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

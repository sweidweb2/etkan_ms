"use client";

import { ErrorPage } from "@/components/errors/error-page";

type RootErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RootError({ error, reset }: RootErrorProps) {
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

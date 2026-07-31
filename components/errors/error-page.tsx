import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

type ErrorPageProps = {
  title: string;
  description: string;
  reset?: () => void;
  homeHref?: string;
  homeLabel?: string;
};

export function ErrorPage({
  title,
  description,
  reset,
  homeHref = ROUTES.HOME,
  homeLabel = "Go home",
}: ErrorPageProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Error
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {reset ? (
          <Button type="button" onClick={reset}>
            Try again
          </Button>
        ) : null}
        <Button
          render={<Link href={homeHref} />}
          nativeButton={false}
          variant="outline"
        >
          {homeLabel}
        </Button>
      </div>
    </div>
  );
}

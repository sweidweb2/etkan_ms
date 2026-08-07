import { PageSpinner } from "@/components/loaders/page-spinner";
import { TopLoaderPendingBridge } from "@/components/loaders/top-loader-pending-bridge";
import { cn } from "@/lib/utils";

type FullPageLoaderProps = {
  label?: string;
  className?: string;
};

export function FullPageLoader({
  label = "Loading",
  className,
}: FullPageLoaderProps) {
  return (
    <div
      className={cn("flex min-h-dvh items-center justify-center", className)}
      aria-busy="true"
    >
      <TopLoaderPendingBridge />
      <PageSpinner label={label} />
    </div>
  );
}

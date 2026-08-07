import { PageSpinner } from "@/components/loaders/page-spinner";
import { TopLoaderPendingBridge } from "@/components/loaders/top-loader-pending-bridge";

type PanelRouteLoadingProps = {
  label?: string;
};

export function PanelRouteLoading({
  label = "Loading page…",
}: PanelRouteLoadingProps) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <TopLoaderPendingBridge />
      <PageSpinner label={label} />
    </div>
  );
}

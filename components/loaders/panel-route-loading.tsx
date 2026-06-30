import { PageSpinner } from "@/components/loaders/page-spinner";

type PanelRouteLoadingProps = {
  label?: string;
};

export function PanelRouteLoading({
  label = "Loading page…",
}: PanelRouteLoadingProps) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <PageSpinner label={label} />
    </div>
  );
}

import { FullPageLoader } from "@/components/loaders/full-page-loader";
import { PanelRouteLoading } from "@/components/loaders/panel-route-loading";

type RouteLoadingVariant = "full-page" | "panel";

type RouteLoadingProps = {
  variant?: RouteLoadingVariant;
  label?: string;
};

export function RouteLoading({
  variant = "full-page",
  label,
}: RouteLoadingProps) {
  if (variant === "panel") {
    return <PanelRouteLoading label={label} />;
  }

  return <FullPageLoader label={label} />;
}

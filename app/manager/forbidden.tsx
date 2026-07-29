import { ErrorPage } from "@/components/errors/error-page";
import { ROUTES } from "@/lib/constants/routes";

export default function ManagerForbiddenPage() {
  return (
    <ErrorPage
      title="Access denied"
      description="You do not have permission to view this page."
      homeHref={ROUTES.HOME}
      homeLabel="Go home"
    />
  );
}

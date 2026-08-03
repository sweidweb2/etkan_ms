import { ErrorPage } from "@/components/errors/error-page";
import { ROUTES } from "@/lib/constants/routes";

export default function InstructorForbiddenPage() {
  return (
    <ErrorPage
      title="Access denied"
      description="You do not have permission to view this instructor page."
      homeHref={ROUTES.INSTRUCTOR_WORKSHOPS}
      homeLabel="Back to my workshops"
    />
  );
}

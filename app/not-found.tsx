import { ErrorPage } from "@/components/errors/error-page";

export default function NotFound() {
  return (
    <ErrorPage
      title="Page not found"
      description="The page you are looking for does not exist or may have been moved."
    />
  );
}

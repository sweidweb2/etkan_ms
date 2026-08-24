import { Suspense } from "react";
import { SearchParamsToast } from "@/components/toast/search-params-toast";
import { Toaster } from "@/components/ui/sonner";

export function AppToasts() {
  return (
    <>
      <Toaster richColors closeButton />
      <Suspense fallback={null}>
        <SearchParamsToast />
      </Suspense>
    </>
  );
}

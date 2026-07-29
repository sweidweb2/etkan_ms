import { Suspense } from "react";
import { CareersSection } from "@/components/public/careers-section";

export default function CareersPage() {
  return (
    <Suspense fallback={null}>
      <CareersSection />
    </Suspense>
  );
}

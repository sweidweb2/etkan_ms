import { LifeBlogsSection } from "@/components/public/life-blogs-section";
import { LifeFeaturedCarousel } from "@/components/public/life-featured-carousel";

export default function LifePage() {
  return (
    <main className="flex-1">
      <LifeFeaturedCarousel />
      <LifeBlogsSection />
    </main>
  );
}

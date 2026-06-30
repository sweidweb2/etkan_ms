import { SiteNavbar } from "@/components/layout/site-navbar";
import { SITE } from "@/lib/config/site";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteNavbar />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">{SITE.name}</h1>
        <p className="mt-2 text-muted-foreground">{SITE.tagline}</p>
      </main>
    </div>
  );
}

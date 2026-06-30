import { SiteNavbar } from "@/components/layout/site-navbar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNavbar />
      <main className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-8">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

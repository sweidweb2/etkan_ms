import Link from "next/link";
import { AppLogo } from "@/components/brand/app-logo";
import { SITE } from "@/lib/config/site";
import { ROUTES } from "@/lib/constants/routes";

/**
 * Overrides parent `(public)` force-static. Login uses searchParams + locale
 * cookies; signup may use session. Never remove while those stay server-side.
 */
export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 px-4 pt-24 pb-8">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
        <Link href={ROUTES.HOME} aria-label={SITE.name}>
          <AppLogo height={44} priority />
        </Link>
        <div className="w-full">{children}</div>
      </div>
    </main>
  );
}

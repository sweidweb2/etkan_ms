import type { Metadata } from "next";
import {
  removeTempRegistrationDocumentAction,
  submitPublicRegistrationAction,
  tempUploadRegistrationDocumentAction,
} from "@/app/(public)/register/actions";
import { RegistrationWizard } from "@/components/public/registration/registration-wizard";
import { JsonLd } from "@/components/seo/json-ld";
import { getTurnstileSiteKey } from "@/lib/cloudflare/turnstile";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PAGE_SEO } from "@/lib/seo/page-seo";

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_SEO.register.title,
  description: PAGE_SEO.register.description,
  path: PAGE_SEO.register.path,
});

export default function RegisterPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-24 sm:px-6 sm:py-28">
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: PAGE_SEO.home.path },
          { name: PAGE_SEO.register.title, path: PAGE_SEO.register.path },
        ])}
      />
      <RegistrationWizard
        turnstileSiteKey={getTurnstileSiteKey() ?? ""}
        submitAction={submitPublicRegistrationAction}
        documentUploadAction={tempUploadRegistrationDocumentAction}
        documentRemoveAction={removeTempRegistrationDocumentAction}
      />
    </main>
  );
}

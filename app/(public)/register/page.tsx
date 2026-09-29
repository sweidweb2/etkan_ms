import {
  removeTempRegistrationDocumentAction,
  submitPublicRegistrationAction,
  tempUploadRegistrationDocumentAction,
} from "@/app/(public)/register/actions";
import { RegistrationWizard } from "@/components/public/registration/registration-wizard";
import { getTurnstileSiteKey } from "@/lib/cloudflare/turnstile";

export default function RegisterPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-24 sm:px-6 sm:py-28">
      <RegistrationWizard
        turnstileSiteKey={getTurnstileSiteKey() ?? ""}
        submitAction={submitPublicRegistrationAction}
        documentUploadAction={tempUploadRegistrationDocumentAction}
        documentRemoveAction={removeTempRegistrationDocumentAction}
      />
    </main>
  );
}

import type { ReactNode } from "react";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { RegistrationWizard } from "@/components/public/registration/registration-wizard";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getGuestRegistrationContextByToken } from "@/services/guests/guest-registration.service";
import { submitGuestRegistrationByTokenAction } from "./actions";

export const dynamic = "force-dynamic";

type RegisterGuestPageProps = {
  params: Promise<{ token: string }>;
};

function GuestInviteShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-12 pt-10 sm:px-6 sm:pt-14">
      {children}
    </main>
  );
}

function GuestRegistrationStatus({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <GuestInviteShell>
      <div className="flex justify-end">
        <LanguageToggle />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{body}</CardDescription>
        </CardHeader>
      </Card>
    </GuestInviteShell>
  );
}

export default async function RegisterGuestPage({
  params,
}: RegisterGuestPageProps) {
  const { token } = await params;
  const adminClient = createSupabaseAdminClient();
  const context = await getGuestRegistrationContextByToken(adminClient, token);

  if (context.status === "invalid") {
    return (
      <GuestRegistrationStatus
        title="Invalid invite"
        body="This registration link is invalid, expired, or was never issued. Ask staff for a new invite if you still need to register."
      />
    );
  }

  if (context.status === "stopped") {
    return (
      <GuestRegistrationStatus
        title="Invite stopped"
        body="Staff stopped this registration invite. Ask them to reopen it if you still need to submit."
      />
    );
  }

  if (context.status === "used") {
    return (
      <GuestRegistrationStatus
        title="Already submitted"
        body="This registration was already completed. You cannot submit again with this link."
      />
    );
  }

  return (
    <GuestInviteShell>
      <RegistrationWizard
        mode="guest-public"
        submitAction={submitGuestRegistrationByTokenAction}
        inviteToken={context.token}
        ageHint={context.prefill.age}
        initialDraft={{
          full_name: context.prefill.full_name,
          phone: context.prefill.phone,
          education_level: context.prefill.education_level,
          organization_name: context.prefill.organization_name ?? "",
        }}
      />
    </GuestInviteShell>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";
import { CheckIcon, CopyIcon, SparklesIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  ManagerEmailSentDetail,
  ManagerEmailUserRow,
} from "@/types/manager-emailing";

type SentEmailDetailsPanelProps = {
  email: ManagerEmailSentDetail;
  recipients: ManagerEmailUserRow[];
};

const DELIVERY_STATUS_CLASS: Record<string, string> = {
  sent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  failed: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  skipped: "bg-muted text-muted-foreground",
};

function DetailField({
  label,
  value,
  children,
  className,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className={cn("text-sm text-foreground", className)}>
        {children ?? value ?? "—"}
      </dd>
    </div>
  );
}

function DeliveryStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium capitalize",
        DELIVERY_STATUS_CLASS[status] ?? DELIVERY_STATUS_CLASS.pending
      )}
    >
      {status}
    </span>
  );
}

export function SentEmailDetailsPanel({
  email,
  recipients,
}: SentEmailDetailsPanelProps) {
  const [copied, setCopied] = useState(false);
  const sentCount = recipients.filter(
    (recipient) => recipient.delivery_status === "sent"
  ).length;
  const failedCount = recipients.filter(
    (recipient) => recipient.delivery_status === "failed"
  ).length;

  async function copyBody() {
    const text = email.body?.trim();
    if (!text) {
      showErrorToast("Nothing to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showSuccessToast("Body copied to clipboard.");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      showErrorToast("Unable to copy body.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_SENT}>
              Sent
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Ref. {email.reference_code}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {email.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ref. {email.reference_code} · {email.template_label}
          </p>
        </div>
        <Can permission={PERMISSIONS.EMAILING_SEND}>
          <Link
            href={ROUTES.MANAGER_EMAILING_COMPOSE}
            className={cn(buttonVariants({ size: "default" }), "shrink-0")}
          >
            <SparklesIcon data-icon="inline-start" />
            Full customization
          </Link>
        </Can>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 py-3">
          <CardTitle>Email details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Reference" value={`Ref. ${email.reference_code}`} />
          <DetailField label="Template" value={email.template_label} />
          <DetailField
            label="Language"
            value={email.locale === "ar" ? "Arabic (RTL)" : "English (LTR)"}
          />
          <DetailField
            label="Sent at"
            value={
              email.created_at
                ? format(new Date(email.created_at), "MMM d, yyyy HH:mm")
                : "—"
            }
          />
          <DetailField
            label="Recipients"
            value={`${sentCount} sent / ${recipients.length} total`}
          />
          <DetailField
            label="Failed"
            value={failedCount > 0 ? String(failedCount) : "0"}
          />
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 py-3">
          <CardTitle>Body</CardTitle>
          <CardAction className="self-center">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Copy body"
              disabled={!email.body?.trim()}
              onClick={() => {
                void copyBody();
              }}
            >
              {copied ? (
                <CheckIcon className="size-4" />
              ) : (
                <CopyIcon className="size-4" />
              )}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="p-4">
          <pre
            className={cn(
              "whitespace-pre-wrap rounded-lg border border-border/80 bg-muted/20 p-4 text-sm leading-relaxed",
              email.locale === "ar" && "text-right"
            )}
            dir={email.locale === "ar" ? "rtl" : "ltr"}
          >
            {email.body || "—"}
          </pre>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="border-b py-3">
          <CardTitle>Recipients (email_users)</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Sent at</th>
                  <th className="px-4 py-3 font-medium">User id</th>
                  <th className="px-4 py-3 font-medium">Mailtrap id</th>
                </tr>
              </thead>
              <tbody>
                {recipients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No recipients logged for this circular.
                    </td>
                  </tr>
                ) : (
                  recipients.map((recipient) => (
                    <tr
                      key={recipient.id}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-4 py-3 font-medium">
                        {recipient.email_address}
                      </td>
                      <td className="px-4 py-3">
                        <DeliveryStatusBadge
                          status={recipient.delivery_status}
                        />
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {recipient.sent_at
                          ? format(
                              new Date(recipient.sent_at),
                              "MMM d, yyyy HH:mm"
                            )
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {recipient.student_id ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {recipient.mailtrap_message_id ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

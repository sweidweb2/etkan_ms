"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MailIcon,
  SearchIcon,
  SendIcon,
  SparklesIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import {
  ResendEmailButton,
  ResendEmailDialog,
} from "@/components/manager/emailing/resend-email-dialog";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getManagerEmailSentDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { ManagerEmailSentListRow } from "@/types/manager-emailing";
import type { ManagerUserRow } from "@/types/manager-user";

const PAGE_SIZE = 20;

type ManageSentEmailsPanelProps = {
  initialEmails: ManagerEmailSentListRow[];
  initialUsers: ManagerUserRow[];
  totalCount: number;
};

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);

  for (let offset = -1; offset <= 1; offset += 1) {
    const page = currentPage + offset;
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  const sortedPages = [...pages].sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage !== undefined && page - previousPage > 1) {
      result.push("ellipsis");
    }
    result.push(page);
  });

  return result;
}

export function ManageSentEmailsPanel({
  initialEmails,
  initialUsers,
  totalCount,
}: ManageSentEmailsPanelProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [resendTarget, setResendTarget] =
    useState<ManagerEmailSentListRow | null>(null);

  const stats = useMemo(() => {
    return {
      total: totalCount,
      recipients: initialEmails.reduce(
        (sum, email) => sum + email.recipient_count,
        0
      ),
      sent: initialEmails.reduce((sum, email) => sum + email.sent_count, 0),
      failed: initialEmails.reduce((sum, email) => sum + email.failed_count, 0),
    };
  }, [initialEmails, totalCount]);

  const filteredEmails = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return initialEmails;
    }

    return initialEmails.filter((email) => {
      const haystack = [
        email.reference_code,
        email.title,
        email.template_label,
        email.locale,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [initialEmails, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEmails.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);

  const paginatedEmails = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredEmails.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredEmails, safeCurrentPage]);

  const rangeStart =
    filteredEmails.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(
    safeCurrentPage * PAGE_SIZE,
    filteredEmails.length
  );

  const openDetails = (emailId: string) => {
    router.push(getManagerEmailSentDetailRoute(emailId));
  };

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader title="Sent emails" />
      <div className="flex flex-wrap items-center justify-end gap-2 empty:hidden">
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

      <div className="grid gap-4 @lg/panel:grid-cols-2 @4xl/panel:grid-cols-4">
        <UserStatCard
          label="Circulars"
          value={stats.total}
          accentClassName="border-l-sky-500"
        />
        <UserStatCard
          label="Recipients"
          value={stats.recipients}
          accentClassName="border-l-violet-500"
        />
        <UserStatCard
          label="Delivered"
          value={stats.sent}
          accentClassName="border-l-emerald-500"
        />
        <UserStatCard
          label="Failed"
          value={stats.failed}
          accentClassName="border-l-rose-500"
        />
      </div>

      <Card className="py-0">
        <CardHeader className="border-b py-3">
          <CardTitle className="flex items-center gap-2">
            <SendIcon className="size-4 text-muted-foreground" />
            Sent
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="border-b px-4 pt-2 pb-3">
            <div className="relative max-w-md">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search reference, title, template…"
                className="pl-8"
                aria-label="Search sent emails"
              />
            </div>
          </div>

          {paginatedEmails.length === 0 ? (
            <EmptyState
              size="sm"
              className="m-4"
              icon={initialEmails.length === 0 ? MailIcon : SearchIcon}
              title={
                initialEmails.length === 0
                  ? "No sent emails yet"
                  : "No emails match your search"
              }
              description={
                initialEmails.length === 0
                  ? "Sent circulars will appear here."
                  : "Try a different search term."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Template</th>
                    <th className="px-4 py-3 font-medium">Language</th>
                    <th className="px-4 py-3 font-medium">Recipients</th>
                    <th className="px-4 py-3 font-medium">Sent at</th>
                    <th className="w-28 px-4 py-3 text-center font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmails.map((email) => (
                    <tr
                      key={email.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Open ${email.reference_code}`}
                      className={cn(
                        "cursor-pointer border-b last:border-b-0 transition-colors hover:bg-muted/40"
                      )}
                      onClick={() => openDetails(email.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openDetails(email.id);
                        }
                      }}
                    >
                      <td className="px-4 py-3 font-medium tabular-nums">
                        Ref. {email.reference_code}
                      </td>
                      <td className="px-4 py-3">{email.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {email.template_label}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground uppercase">
                        {email.locale}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {email.sent_count}/{email.recipient_count}
                        {email.failed_count > 0
                          ? ` · ${email.failed_count} failed`
                          : ""}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {email.created_at
                          ? format(
                              new Date(email.created_at),
                              "MMM d, yyyy HH:mm"
                            )
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Can permission={PERMISSIONS.EMAILING_RESEND}>
                          <ResendEmailButton
                            onClick={() => setResendTarget(email)}
                          />
                        </Can>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {filteredEmails.length}
              <span aria-hidden="true"> · </span>
              {PAGE_SIZE} rows per page
            </p>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={safeCurrentPage <= 1}
                onClick={() =>
                  setCurrentPage((page) => Math.max(1, page - 1))
                }
                aria-label="Previous page"
              >
                <ChevronLeftIcon />
              </Button>

              {pageNumbers.map((page, index) =>
                page === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-1 text-sm text-muted-foreground"
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={page}
                    type="button"
                    variant={page === safeCurrentPage ? "default" : "outline"}
                    size="icon-sm"
                    className="min-w-7"
                    onClick={() => setCurrentPage(page)}
                    aria-label={`Page ${page}`}
                    aria-current={
                      page === safeCurrentPage ? "page" : undefined
                    }
                  >
                    {page}
                  </Button>
                )
              )}

              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={safeCurrentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                aria-label="Next page"
              >
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ResendEmailDialog
        open={resendTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setResendTarget(null);
          }
        }}
        email={resendTarget}
        users={initialUsers}
      />
    </div>
  );
}

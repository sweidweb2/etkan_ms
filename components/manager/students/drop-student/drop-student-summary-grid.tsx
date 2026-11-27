import { format } from "date-fns";
import { MANAGER_CLASS_STATUS_LABELS } from "@/lib/constants/manager-class-display";
import type { ClassStatusValue } from "@/lib/constants/manager-class-status";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { MANAGER_STUDENT_STATUS_LABELS } from "@/lib/constants/manager-student-display";
import type { DropStudentConsoleSnapshot } from "@/types/manager-drop-student-console";

type DropStudentSummaryGridProps = {
  snapshot: DropStudentConsoleSnapshot;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function classStatusLabel(status: string) {
  return (
    MANAGER_CLASS_STATUS_LABELS[status as ClassStatusValue] ?? status
  );
}

export function DropStudentSummaryGrid({
  snapshot,
}: DropStudentSummaryGridProps) {
  const { student, classes, billing, drops, need_refund, processed_refund_payments } =
    snapshot;

  return (
    <div className="grid gap-4 @3xl/panel:grid-cols-2">
      <Section title="Profile">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Name</dt>
            <dd className="font-medium">{student.full_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd className="font-medium">
              {MANAGER_STUDENT_STATUS_LABELS[student.status]}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd>{student.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Phone</dt>
            <dd>{student.phone || "—"}</dd>
          </div>
        </dl>
      </Section>

      <Section title="Classes">
        {classes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No class memberships.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {classes.map((row) => (
              <li
                key={row.student_class_id}
                className="flex items-start justify-between gap-2 border-b pb-2 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{row.class_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.semester_name ?? "No semester"} ·{" "}
                    {classStatusLabel(row.class_status)}
                    {row.is_team_leader ? " · Team leader" : ""}
                  </p>
                  {!row.can_remove && row.remove_blocked_reason ? (
                    <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                      {row.remove_blocked_reason}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Billing & payment history">
        {billing.length === 0 ? (
          <p className="text-sm text-muted-foreground">No SPP records.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {billing.map((spp) => (
              <li key={spp.spp_id} className="border-b pb-3 last:border-0 last:pb-0">
                <p className="font-medium">{spp.payment_phase_name}</p>
                <p className="text-xs text-muted-foreground">
                  {spp.semester_name ?? "—"} · {spp.spp_status} · paid{" "}
                  {formatPaymentPhaseMoney(spp.total_paid)} / due{" "}
                  {formatPaymentPhaseMoney(spp.final_amount_due)}
                </p>
                {spp.payments.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    No payments yet.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {spp.payments.map((payment) => (
                      <li key={payment.id} className="flex justify-between gap-2">
                        <span>
                          {format(
                            new Date(`${payment.payment_date}T00:00:00`),
                            "MMM d, yyyy"
                          )}{" "}
                          · {payment.type} · {payment.payment_method}
                        </span>
                        <span className="tabular-nums">
                          {formatPaymentPhaseMoney(payment.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Drops & refunds">
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Drop requests
            </p>
            {drops.length === 0 ? (
              <p className="mt-1 text-muted-foreground">None.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {drops.map((drop) => (
                  <li key={drop.id} className="flex justify-between gap-2">
                    <span>
                      {drop.semester_name ?? "Semester"} · {drop.status}
                      {drop.restriction_mode
                        ? ` · ${drop.restriction_mode}`
                        : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      refund {drop.refund_status}
                      {drop.remaining_refund > 0
                        ? ` · ${formatPaymentPhaseMoney(drop.remaining_refund)} left`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Need refund
            </p>
            {need_refund.length === 0 ? (
              <p className="mt-1 text-muted-foreground">None.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {need_refund.map((row) => (
                  <li key={row.id}>
                    {formatPaymentPhaseMoney(row.remaining_refund)} remaining
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Processed refund debits
            </p>
            {processed_refund_payments.length === 0 ? (
              <p className="mt-1 text-muted-foreground">None.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {processed_refund_payments.map((row) => (
                  <li key={row.id} className="flex justify-between gap-2">
                    <span>
                      {format(
                        new Date(`${row.payment_date}T00:00:00`),
                        "MMM d, yyyy"
                      )}
                    </span>
                    <span className="tabular-nums">
                      {formatPaymentPhaseMoney(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}

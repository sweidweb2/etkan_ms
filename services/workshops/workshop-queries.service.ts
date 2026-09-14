import {
  WORKSHOP_PAYMENT_TYPES,
} from "@/lib/constants/manager-workshop-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import type { RoleValue } from "@/lib/constants/roles";
import { ENTITY_SCHEDULE_TYPE_WORKSHOP } from "@/lib/validators/manager/instructor-schedule-slot";
import * as profileRepository from "@/repositories/profile.repository";
import * as instructorScheduleSlotRepository from "@/repositories/instructor-schedule-slot.repository";
import type { InstructorScheduleSlotRecord } from "@/repositories/instructor-schedule-slot.repository";
import * as workshopDocumentRepository from "@/repositories/workshop-document.repository";
import * as workshopInstructorRepository from "@/repositories/workshop-instructor.repository";
import type { WorkshopInstructorWithProfileRecord } from "@/repositories/workshop-instructor.repository";
import * as workshopPaymentRepository from "@/repositories/workshop-payment.repository";
import * as workshopRepository from "@/repositories/workshop.repository";
import * as workshopSessionRepository from "@/repositories/workshop-session.repository";
import {
  assertPermission,
} from "@/services/auth/authorization.service";
import { mapInstructorScheduleSlotRecordToSession } from "@/services/schedule/instructor-schedule-slot.service";
import type {
  ManagerWorkshopInstructorCandidate,
  ManagerWorkshopPaymentLedgerRow,
  ManagerWorkshopPaymentRow,
  ManagerWorkshopPaymentSummary,
  ManagerWorkshopPaymentsTotals,
  ManagerWorkshopRow,
  ManagerWorkshopDetailPageData,
} from "@/types/manager-workshop";
import {
  actorCanAccessWorkshop,
  attachPaidNet,
  mapWorkshopDocumentRecord,
  mapWorkshopInstructorRecord,
  mapWorkshopPaymentRecord,
  mapWorkshopRecordToRow,
  mapWorkshopSessionRecord,
  resolveActorRole,
  roleCanViewAllWorkshops,
  type Supabase,
} from "@/services/workshops/workshop-shared";

export function buildWorkshopPaymentSummary(
  payments: ManagerWorkshopPaymentRow[],
  price: number | null
): ManagerWorkshopPaymentSummary {
  let credits = 0;
  let debits = 0;

  for (const payment of payments) {
    if (payment.type === WORKSHOP_PAYMENT_TYPES.CREDIT) {
      credits += payment.amount;
    } else {
      debits += payment.amount;
    }
  }

  const net = credits - debits;
  const remaining = price == null ? null : price - net;

  return { credits, debits, net, price, remaining };
}

export async function listWorkshopsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  /** Prefer session pack role to avoid a redundant profiles.role round-trip. */
  actorRole?: RoleValue | null
): Promise<ManagerWorkshopRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.WORKSHOPS_VIEW);

  if (!actorUserId) {
    return [];
  }

  const role =
    actorRole !== undefined
      ? actorRole
      : await resolveActorRole(adminClient, actorUserId);

  if (roleCanViewAllWorkshops(role)) {
    const result = await workshopRepository.listWorkshops(adminClient);
    if (result.error) {
      throw new Error(result.error.message);
    }
    return attachPaidNet(
      adminClient,
      (result.data ?? []).map(mapWorkshopRecordToRow)
    );
  }

  const assignmentsResult =
    await workshopInstructorRepository.listWorkshopInstructorsByUserId(
      adminClient,
      actorUserId
    );

  if (assignmentsResult.error) {
    throw new Error(assignmentsResult.error.message);
  }

  const workshopIds = [
    ...new Set(
      (assignmentsResult.data ?? []).map((row) => row.workshop_id)
    ),
  ];

  const result = await workshopRepository.listWorkshopsByIds(
    adminClient,
    workshopIds
  );

  if (result.error) {
    throw new Error(result.error.message);
  }

  return attachPaidNet(
    adminClient,
    (result.data ?? []).map(mapWorkshopRecordToRow),
    workshopIds
  );
}

export function buildWorkshopPaymentsTotals(
  payments: ManagerWorkshopPaymentLedgerRow[]
): ManagerWorkshopPaymentsTotals {
  let credits = 0;
  let debits = 0;
  const workshopIds = new Set<string>();

  for (const payment of payments) {
    workshopIds.add(payment.workshop_id);
    if (payment.type === WORKSHOP_PAYMENT_TYPES.CREDIT) {
      credits += payment.amount;
    } else {
      debits += payment.amount;
    }
  }

  return {
    credits,
    debits,
    net: credits - debits,
    payment_count: payments.length,
    workshops_with_payments: workshopIds.size,
  };
}

export async function listAllWorkshopPaymentsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<{
  payments: ManagerWorkshopPaymentLedgerRow[];
  totals: ManagerWorkshopPaymentsTotals;
}> {
  const overview = await getWorkshopPaymentsOverviewForManager(
    adminClient,
    actorUserId,
    { page: 1, pageSize: 10 }
  );
  return {
    payments: overview.payments,
    totals: overview.totals,
  };
}

export async function getWorkshopPaymentsOverviewForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  options: { page?: number; pageSize?: number } = {}
): Promise<{
  payments: ManagerWorkshopPaymentLedgerRow[];
  totals: ManagerWorkshopPaymentsTotals;
  totalCount: number;
  page: number;
  pageSize: number;
}> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_PAYMENTS_VIEW
  );

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 10));
  const offset = (page - 1) * pageSize;

  const [pageResult, totalsResult] = await Promise.all([
    workshopPaymentRepository.listWorkshopPaymentsPage(adminClient, {
      offset,
      limit: pageSize,
    }),
    workshopPaymentRepository.aggregateWorkshopPaymentsTotals(
      adminClient,
      WORKSHOP_PAYMENT_TYPES.CREDIT,
      WORKSHOP_PAYMENT_TYPES.DEBIT
    ),
  ]);

  if (pageResult.error) {
    throw new Error(pageResult.error.message);
  }
  if (totalsResult.error) {
    throw new Error(totalsResult.error.message);
  }

  const payments: ManagerWorkshopPaymentLedgerRow[] = (pageResult.data ?? []).map(
    (record) => {
      const workshopRelation = record.workshops as
        | { name: string }
        | { name: string }[]
        | null;
      const workshopName = Array.isArray(workshopRelation)
        ? (workshopRelation[0]?.name ?? "—")
        : (workshopRelation?.name ?? "—");

      return {
        ...mapWorkshopPaymentRecord(record),
        workshop_name: workshopName,
      };
    }
  );

  return {
    payments,
    totals: totalsResult.data!,
    totalCount: pageResult.count ?? payments.length,
    page,
    pageSize,
  };
}

export async function getWorkshopForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  workshopId: string
): Promise<ManagerWorkshopDetailPageData | null> {
  const timer = createNavStepTimer("getWorkshop");
  try {
    await timer.step("auth", () =>
      assertPermission(adminClient, actorUserId, PERMISSIONS.WORKSHOPS_VIEW)
    );

    if (!actorUserId) {
      return null;
    }

    const canAccess = await timer.step("canAccess", () =>
      actorCanAccessWorkshop(adminClient, actorUserId, workshopId)
    );
    if (!canAccess) {
      return null;
    }

    const [
      workshopResult,
      instructorsResult,
      documentsResult,
      sessionsResult,
      paymentCountResult,
    ] = await timer.step("graph", () =>
      Promise.all([
        workshopRepository.findWorkshopById(adminClient, workshopId),
        workshopInstructorRepository.listWorkshopInstructorsByWorkshopId(
          adminClient,
          workshopId
        ),
        workshopDocumentRepository.listWorkshopDocumentsByWorkshopId(
          adminClient,
          workshopId
        ),
        workshopSessionRepository.listWorkshopSessionsByWorkshopId(
          adminClient,
          workshopId
        ),
        workshopRepository.countWorkshopPaymentsByWorkshopId(
          adminClient,
          workshopId
        ),
      ])
    );

    if (workshopResult.error) {
      throw new Error(workshopResult.error.message);
    }

    if (instructorsResult.error) {
      throw new Error(instructorsResult.error.message);
    }

    if (documentsResult.error) {
      throw new Error(documentsResult.error.message);
    }

    if (sessionsResult.error) {
      throw new Error(sessionsResult.error.message);
    }

    if (paymentCountResult.error) {
      throw new Error(paymentCountResult.error.message);
    }

    if (!workshopResult.data) {
      return null;
    }

    const workshop = mapWorkshopRecordToRow(workshopResult.data);
    const instructors = (
      (instructorsResult.data ?? []) as WorkshopInstructorWithProfileRecord[]
    ).map(mapWorkshopInstructorRecord);
    const documents = (documentsResult.data ?? []).map(mapWorkshopDocumentRecord);
    const sessions = (sessionsResult.data ?? []).map(mapWorkshopSessionRecord);

    return {
      workshop,
      payment_count: paymentCountResult.count ?? 0,
      payments: [],
      payment_summary: buildWorkshopPaymentSummary([], workshop.price),
      instructors,
      instructorCandidates: [],
      documents,
      scheduleSlots: [],
      sessions,
    };
  } finally {
    timer.end();
  }
}

export async function listWorkshopPaymentsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  workshopId: string
): Promise<{
  payments: ManagerWorkshopPaymentRow[];
  summary: ManagerWorkshopPaymentSummary;
} | null> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_PAYMENTS_VIEW
  );

  if (!actorUserId) {
    return null;
  }

  const canAccess = await actorCanAccessWorkshop(
    adminClient,
    actorUserId,
    workshopId
  );
  if (!canAccess) {
    return null;
  }

  const [workshopResult, paymentsResult] = await Promise.all([
    workshopRepository.findWorkshopById(adminClient, workshopId),
    workshopPaymentRepository.listWorkshopPaymentsByWorkshopId(
      adminClient,
      workshopId
    ),
  ]);

  if (workshopResult.error) {
    throw new Error(workshopResult.error.message);
  }

  if (paymentsResult.error) {
    throw new Error(paymentsResult.error.message);
  }

  if (!workshopResult.data) {
    return null;
  }

  const payments = (paymentsResult.data ?? []).map(mapWorkshopPaymentRecord);
  const workshop = mapWorkshopRecordToRow(workshopResult.data);

  return {
    payments,
    summary: buildWorkshopPaymentSummary(payments, workshop.price),
  };
}

export async function listWorkshopInstructorCandidatesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  workshopId: string
): Promise<ManagerWorkshopInstructorCandidate[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_INSTRUCTORS_CREATE
  );

  if (!actorUserId) {
    return [];
  }

  const canAccess = await actorCanAccessWorkshop(
    adminClient,
    actorUserId,
    workshopId
  );
  if (!canAccess) {
    return [];
  }

  const [instructorsResult, candidatesResult] = await Promise.all([
    workshopInstructorRepository.listWorkshopInstructorsByWorkshopId(
      adminClient,
      workshopId
    ),
    profileRepository.listInstructorProfiles(adminClient),
  ]);

  if (instructorsResult.error) {
    throw new Error(instructorsResult.error.message);
  }

  if (candidatesResult.error) {
    throw new Error(candidatesResult.error.message);
  }

  const assignedUserIds = new Set(
    (
      (instructorsResult.data ?? []) as WorkshopInstructorWithProfileRecord[]
    ).map((row) => row.user_id)
  );

  return (candidatesResult.data ?? [])
    .filter((profile) => !assignedUserIds.has(profile.id))
    .map((profile) => ({
      id: profile.id,
      username: profile.username ?? "Unknown",
    }));
}

export async function listWorkshopScheduleSlotsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  workshopId: string
) {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
  );

  if (!actorUserId) {
    return [];
  }

  const canAccess = await actorCanAccessWorkshop(
    adminClient,
    actorUserId,
    workshopId
  );
  if (!canAccess) {
    return [];
  }

  const result =
    await instructorScheduleSlotRepository.listInstructorScheduleSlotsByRecord(
      adminClient,
      ENTITY_SCHEDULE_TYPE_WORKSHOP,
      workshopId
    );

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []).map((record) =>
    mapInstructorScheduleSlotRecordToSession(
      record as InstructorScheduleSlotRecord
    )
  );
}

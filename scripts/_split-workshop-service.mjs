import fs from "fs";

const srcPath = "services/workshops/workshop.service.ts";
const lines = fs.readFileSync(srcPath, "utf8").split(/\r?\n/);
const slice = (start, end) => lines.slice(start - 1, end).join("\n");

function exportHelpers(code, names) {
  let out = code;
  for (const name of names) {
    out = out.replace(
      new RegExp(`^(async function ${name}\\b)`, "m"),
      "export $1"
    );
    out = out.replace(new RegExp(`^(function ${name}\\b)`, "m"), "export $1");
  }
  return out;
}

const sharedPart1 = slice(114, 528);
const sharedPart2 = slice(551, 677);
let sharedBody = sharedPart1 + "\n\n" + sharedPart2;

const sharedExports = [
  "contentLockErrorForWorkshopStatus",
  "mapWorkshopRecordToRow",
  "mapCreateWorkshopError",
  "mapUpdateWorkshopError",
  "mapWorkshopInstructorRecord",
  "mapWorkshopDocumentRecord",
  "mapWorkshopPaymentRecord",
  "buildWorkshopPaymentTransactionInput",
  "mapWorkshopSessionRecord",
  "syncWorkshopSessionCount",
  "paidNetFromAmountRows",
  "resolveWorkshopPaidNet",
  "creditExceedsRemainingError",
  "roleCanViewAllWorkshops",
  "resolveActorRole",
  "actorCanAccessWorkshop",
  "attachPaidNet",
];
sharedBody = exportHelpers(sharedBody, sharedExports);
sharedBody = sharedBody.replace(/^type Supabase = /, "export type Supabase = ");

const sharedHeader = `import {
  WORKSHOP_INSTRUCTOR_ROLE_VALUES,
  WORKSHOP_OFFERING_TYPE_VALUES,
  WORKSHOP_OFFERING_TYPES,
  WORKSHOP_PAYMENT_TYPES,
  WORKSHOP_PAYMENT_TYPE_VALUES,
  WORKSHOP_SESSION_STATUS_VALUES,
  WORKSHOP_SESSION_STATUSES,
  WORKSHOP_WAGE_TYPE_VALUES,
  type WorkshopInstructorRole,
  type WorkshopOfferingType,
  type WorkshopPaymentMethod,
  type WorkshopPaymentType,
  type WorkshopSessionStatus,
  type WorkshopWageType,
} from "@/lib/constants/manager-workshop-display";
import {
  WORKSHOP_STATUSES,
  WORKSHOP_STATUS_VALUES,
  type WorkshopStatusValue,
} from "@/lib/constants/manager-workshop-status";
import { TRANSACTION_CATEGORIES } from "@/lib/manager/accounting/constants";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { getWorkshopDocumentPublicUrl } from "@/lib/manager/workshops/storage-path";
import {
  isWorkshopContentMutationLocked,
  WORKSHOP_CONTENT_LOCKED_MESSAGE,
} from "@/lib/manager/workshops/status-transitions";
import { roleSchema } from "@/lib/validators/role";
import { WORKSHOP_PAYMENT_REMAINING_AMOUNT_MESSAGE } from "@/lib/validators/manager/workshop-payment";
import * as profileRepository from "@/repositories/profile.repository";
import * as workshopInstructorRepository from "@/repositories/workshop-instructor.repository";
import type { WorkshopInstructorWithProfileRecord } from "@/repositories/workshop-instructor.repository";
import * as workshopPaymentRepository from "@/repositories/workshop-payment.repository";
import type { WorkshopPaymentRecord } from "@/repositories/workshop-payment.repository";
import * as workshopRepository from "@/repositories/workshop.repository";
import type { WorkshopRecord } from "@/repositories/workshop.repository";
import type { WorkshopDocumentRecord } from "@/repositories/workshop-document.repository";
import type { WorkshopSessionRecord } from "@/repositories/workshop-session.repository";
import type { AuditActor } from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerWorkshopDocumentRow,
  ManagerWorkshopInstructorRow,
  ManagerWorkshopPaymentRow,
  ManagerWorkshopRow,
  ManagerWorkshopSessionRow,
} from "@/types/manager-workshop";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

`;

fs.writeFileSync(
  "services/workshops/workshop-shared.ts",
  sharedHeader + sharedBody + "\n"
);
console.log("wrote workshop-shared.ts");

const queriesBody = slice(530, 549) + "\n\n" + slice(679, 1095);
const queriesHeader = `import {
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

`;

fs.writeFileSync(
  "services/workshops/workshop-queries.service.ts",
  queriesHeader + queriesBody + "\n"
);
console.log("wrote workshop-queries.service.ts");

const lifecycleBody = slice(1097, 1656);
const lifecycleHeader = `import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  deleteAllMirrorsForWorkshop,
  deleteAllWorkshopEntitySlots,
  recopyAllMirrorsForWorkshop,
} from "@/lib/manager/workshops/mirror-instructor-schedule";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { changeWorkshopStatusSchema } from "@/lib/validators/manager/change-workshop-status";
import { createWorkshopSchema } from "@/lib/validators/manager/create-workshop";
import { updateWorkshopSchema } from "@/lib/validators/manager/update-workshop";
import { updateWorkshopProposalNotesSchema } from "@/lib/validators/manager/update-workshop-proposal-notes";
import {
  assertWorkshopStatusTransition,
  formatLocalDateYmd,
  isWorkshopContentMutationLocked,
  WORKSHOP_CONTENT_LOCKED_MESSAGE,
} from "@/lib/manager/workshops/status-transitions";
import * as workshopPaymentRepository from "@/repositories/workshop-payment.repository";
import * as workshopRepository from "@/repositories/workshop.repository";
import * as workshopStorageRepository from "@/repositories/workshop-storage.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  mapCreateWorkshopError,
  mapUpdateWorkshopError,
  mapWorkshopRecordToRow,
  WORKSHOP_HAS_PAYMENTS_DELETE_ERROR,
  type ChangeWorkshopStatusResult,
  type CreateWorkshopResult,
  type DeleteWorkshopResult,
  type Supabase,
  type UpdateWorkshopResult,
} from "@/services/workshops/workshop-shared";

`;

fs.writeFileSync(
  "services/workshops/workshop-lifecycle.service.ts",
  lifecycleHeader + lifecycleBody + "\n"
);
console.log("wrote workshop-lifecycle.service.ts");

const instructorsBody = slice(1658, 2049);
const instructorsHeader = `import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  deleteMirrorsForWorkshopInstructor,
  mirrorWorkshopSlotsToInstructor,
} from "@/lib/manager/workshops/mirror-instructor-schedule";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import {
  createWorkshopInstructorSchema,
  removeWorkshopInstructorSchema,
  updateWorkshopInstructorSchema,
} from "@/lib/validators/manager/workshop-instructor";
import * as workshopInstructorRepository from "@/repositories/workshop-instructor.repository";
import * as workshopRepository from "@/repositories/workshop.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  contentLockErrorForWorkshopStatus,
  mapWorkshopInstructorRecord,
  type RemoveWorkshopInstructorResult,
  type Supabase,
  type WorkshopInstructorMutationResult,
} from "@/services/workshops/workshop-shared";

`;

fs.writeFileSync(
  "services/workshops/workshop-instructors.service.ts",
  instructorsHeader + instructorsBody + "\n"
);
console.log("wrote workshop-instructors.service.ts");

const documentsBody = slice(2051, 2372);
const documentsHeader = `import { PERMISSIONS } from "@/lib/constants/permissions";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import {
  deleteWorkshopDocumentSchema,
  renameWorkshopDocumentSchema,
  uploadWorkshopDocumentSchema,
} from "@/lib/validators/manager/workshop-document";
import { buildWorkshopDocumentStoragePath } from "@/lib/manager/workshops/storage-path";
import * as workshopDocumentRepository from "@/repositories/workshop-document.repository";
import * as workshopRepository from "@/repositories/workshop.repository";
import * as workshopStorageRepository from "@/repositories/workshop-storage.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  contentLockErrorForWorkshopStatus,
  mapWorkshopDocumentRecord,
  type DeleteWorkshopDocumentResult,
  type Supabase,
  type WorkshopDocumentMutationResult,
} from "@/services/workshops/workshop-shared";

`;

fs.writeFileSync(
  "services/workshops/workshop-documents.service.ts",
  documentsHeader + documentsBody + "\n"
);
console.log("wrote workshop-documents.service.ts");

const paymentsBody = slice(2374, 2978);
const paymentsHeader = `import { PERMISSIONS } from "@/lib/constants/permissions";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import {
  createWorkshopPaymentSchema,
  deleteWorkshopPaymentSchema,
  getWorkshopPaymentRemainingCap,
  isWorkshopFullyPaid,
  updateWorkshopPaymentSchema,
  WORKSHOP_PAYMENT_FULLY_PAID_MESSAGE,
} from "@/lib/validators/manager/workshop-payment";
import * as workshopPaymentRepository from "@/repositories/workshop-payment.repository";
import * as workshopRepository from "@/repositories/workshop.repository";
import * as transactionRepository from "@/repositories/transaction.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  buildWorkshopPaymentTransactionInput,
  contentLockErrorForWorkshopStatus,
  creditExceedsRemainingError,
  mapWorkshopPaymentRecord,
  resolveWorkshopPaidNet,
  type DeleteWorkshopPaymentResult,
  type Supabase,
  type WorkshopPaymentMutationResult,
} from "@/services/workshops/workshop-shared";

`;

fs.writeFileSync(
  "services/workshops/workshop-payments.service.ts",
  paymentsHeader + paymentsBody + "\n"
);
console.log("wrote workshop-payments.service.ts");

const sessionsBody = slice(2980, 3347);
const sessionsHeader = `import { PERMISSIONS } from "@/lib/constants/permissions";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import {
  createWorkshopSessionSchema,
  deleteWorkshopSessionSchema,
  updateWorkshopSessionSchema,
} from "@/lib/validators/manager/workshop-session";
import * as workshopRepository from "@/repositories/workshop.repository";
import * as workshopSessionRepository from "@/repositories/workshop-session.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  contentLockErrorForWorkshopStatus,
  mapWorkshopSessionRecord,
  syncWorkshopSessionCount,
  type DeleteWorkshopSessionResult,
  type Supabase,
  type WorkshopSessionMutationResult,
} from "@/services/workshops/workshop-shared";

`;

fs.writeFileSync(
  "services/workshops/workshop-sessions.service.ts",
  sessionsHeader + sessionsBody + "\n"
);
console.log("wrote workshop-sessions.service.ts");

const barrel = `export type {
  ChangeWorkshopStatusFailure,
  ChangeWorkshopStatusResult,
  ChangeWorkshopStatusSuccess,
  CreateWorkshopFailure,
  CreateWorkshopResult,
  CreateWorkshopSuccess,
  DeleteWorkshopDocumentFailure,
  DeleteWorkshopDocumentResult,
  DeleteWorkshopDocumentSuccess,
  DeleteWorkshopFailure,
  DeleteWorkshopPaymentFailure,
  DeleteWorkshopPaymentResult,
  DeleteWorkshopPaymentSuccess,
  DeleteWorkshopResult,
  DeleteWorkshopSessionFailure,
  DeleteWorkshopSessionResult,
  DeleteWorkshopSessionSuccess,
  DeleteWorkshopSuccess,
  RemoveWorkshopInstructorFailure,
  RemoveWorkshopInstructorResult,
  RemoveWorkshopInstructorSuccess,
  UpdateWorkshopFailure,
  UpdateWorkshopResult,
  UpdateWorkshopSuccess,
  WorkshopDocumentMutationFailure,
  WorkshopDocumentMutationResult,
  WorkshopDocumentMutationSuccess,
  WorkshopInstructorMutationFailure,
  WorkshopInstructorMutationResult,
  WorkshopInstructorMutationSuccess,
  WorkshopPaymentMutationFailure,
  WorkshopPaymentMutationResult,
  WorkshopPaymentMutationSuccess,
  WorkshopSessionMutationFailure,
  WorkshopSessionMutationResult,
  WorkshopSessionMutationSuccess,
} from "@/services/workshops/workshop-shared";

export { WORKSHOP_HAS_PAYMENTS_DELETE_ERROR } from "@/services/workshops/workshop-shared";

export {
  buildWorkshopPaymentSummary,
  buildWorkshopPaymentsTotals,
  getWorkshopForManager,
  getWorkshopPaymentsOverviewForManager,
  listAllWorkshopPaymentsForManager,
  listWorkshopInstructorCandidatesForManager,
  listWorkshopPaymentsForManager,
  listWorkshopScheduleSlotsForManager,
  listWorkshopsForManager,
} from "@/services/workshops/workshop-queries.service";

export {
  changeWorkshopStatusForManager,
  createWorkshopForManager,
  deleteWorkshopForManager,
  updateWorkshopForManager,
  updateWorkshopProposalNotesForManager,
} from "@/services/workshops/workshop-lifecycle.service";

export {
  addWorkshopInstructorForManager,
  removeWorkshopInstructorForManager,
  updateWorkshopInstructorForManager,
} from "@/services/workshops/workshop-instructors.service";

export {
  deleteWorkshopDocumentForManager,
  renameWorkshopDocumentForManager,
  uploadWorkshopDocumentForManager,
} from "@/services/workshops/workshop-documents.service";

export {
  createWorkshopPaymentForManager,
  deleteWorkshopPaymentForManager,
  updateWorkshopPaymentForManager,
} from "@/services/workshops/workshop-payments.service";

export {
  createWorkshopSessionForManager,
  deleteWorkshopSessionForManager,
  updateWorkshopSessionForManager,
} from "@/services/workshops/workshop-sessions.service";
`;

fs.writeFileSync("services/workshops/workshop.service.ts", barrel);
console.log("wrote barrel");

for (const f of [
  "workshop-shared.ts",
  "workshop-queries.service.ts",
  "workshop-lifecycle.service.ts",
  "workshop-instructors.service.ts",
  "workshop-documents.service.ts",
  "workshop-payments.service.ts",
  "workshop-sessions.service.ts",
  "workshop.service.ts",
]) {
  const n = fs.readFileSync("services/workshops/" + f, "utf8").split(/\r?\n/)
    .length;
  console.log(f, n);
}

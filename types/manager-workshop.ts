import type { FieldErrors } from "@/types/auth";
import type {
  WorkshopInstructorRole,
  WorkshopOfferingType,
  WorkshopPaymentMethod,
  WorkshopPaymentType,
  WorkshopSessionStatus,
  WorkshopWageType,
} from "@/lib/constants/manager-workshop-display";
import type { WorkshopStatusValue } from "@/lib/constants/manager-workshop-status";
import type { ManagerInstructorScheduleSession } from "@/types/manager-instructor-schedule";

/**
 * Workshop list/detail row.
 * v1 hard-deletes workshops; `deleted_at` exists in DB but is unused in the app.
 */
export interface ManagerWorkshopRow {
  id: string;
  name: string;
  subject: string | null;
  status: WorkshopStatusValue;
  type: WorkshopOfferingType;
  phone: string | null;
  target_audience: string | null;
  nb_participants: number | null;
  proposal_notes: string | null;
  number_of_sessions: number | null;
  price: number | null;
  start_date: string | null;
  end_date: string | null;
  delivery_place: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** Credits minus debits, only attached on list queries. */
  paid_net?: number;
}

export interface ManagerWorkshopInstructorRow {
  id: string;
  workshop_id: string;
  user_id: string;
  role: WorkshopInstructorRole;
  wage_type: WorkshopWageType;
  wage_amount: number | null;
  notes: string | null;
  created_at: string;
  /** Joined profile display when loaded for UI. */
  username?: string | null;
  email?: string | null;
}

export interface ManagerWorkshopDocumentRow {
  id: string;
  workshop_id: string;
  name: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  /** Public Storage URL when loaded for UI. */
  public_url?: string;
}

export type ManagerWorkshopPaymentRow = {
  id: string;
  workshop_id: string;
  amount: number;
  type: WorkshopPaymentType;
  payment_date: string;
  payment_method: WorkshopPaymentMethod | string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type ManagerWorkshopSessionRow = {
  id: string;
  workshop_id: string;
  nb_order: number;
  session_date: string;
  start_time: string;
  end_time: string;
  nb_hours: number;
  topic: string;
  notes: string | null;
  suggestions: string | null;
  status: WorkshopSessionStatus;
  participants_eval: number | null;
  session_eval: number | null;
  created_at: string;
  updated_at: string;
};

export type ManagerWorkshopsPageData = {
  workshops: ManagerWorkshopRow[];
};

export type ManagerWorkshopPaymentLedgerRow = ManagerWorkshopPaymentRow & {
  workshop_name: string;
};

export type ManagerWorkshopPaymentsTotals = {
  credits: number;
  debits: number;
  net: number;
  payment_count: number;
  workshops_with_payments: number;
};

export type ManagerWorkshopInstructorCandidate = {
  id: string;
  username: string;
};

export type ManagerWorkshopDetailPageData = {
  workshop: ManagerWorkshopRow;
  payment_count: number;
  payments: ManagerWorkshopPaymentRow[];
  payment_summary: ManagerWorkshopPaymentSummary;
  instructors: ManagerWorkshopInstructorRow[];
  instructorCandidates: ManagerWorkshopInstructorCandidate[];
  documents: ManagerWorkshopDocumentRow[];
  scheduleSlots: ManagerInstructorScheduleSession[];
  sessions: ManagerWorkshopSessionRow[];
};

export type CreateWorkshopActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  workshop?: ManagerWorkshopRow;
};

export type UpdateWorkshopActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  workshop?: ManagerWorkshopRow;
};

export type DeleteWorkshopActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export type ChangeWorkshopStatusActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  workshop?: ManagerWorkshopRow;
};

export type AddWorkshopInstructorActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  instructor?: ManagerWorkshopInstructorRow;
};

export type UpdateWorkshopInstructorActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  instructor?: ManagerWorkshopInstructorRow;
};

export type RemoveWorkshopInstructorActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export type UploadWorkshopDocumentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  document?: ManagerWorkshopDocumentRow;
};

export type RenameWorkshopDocumentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  document?: ManagerWorkshopDocumentRow;
};

export type DeleteWorkshopDocumentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export type ManagerWorkshopPaymentSummary = {
  credits: number;
  debits: number;
  net: number;
  price: number | null;
  remaining: number | null;
};

export type CreateWorkshopPaymentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  payment?: ManagerWorkshopPaymentRow;
};

export type UpdateWorkshopPaymentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  payment?: ManagerWorkshopPaymentRow;
};

export type DeleteWorkshopPaymentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export type CreateWorkshopSessionActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  session?: ManagerWorkshopSessionRow;
};

export type UpdateWorkshopSessionActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  session?: ManagerWorkshopSessionRow;
};

export type DeleteWorkshopSessionActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

import type { FieldErrors } from "@/types/auth";
import type {
  WorkshopInstructorRole,
  WorkshopPaymentMethod,
  WorkshopPaymentType,
  WorkshopWageType,
} from "@/lib/constants/manager-workshop-display";
import type { WorkshopStatusValue } from "@/lib/constants/manager-workshop-status";

/**
 * Workshop list/detail row.
 * v1 hard-deletes workshops; `deleted_at` exists in DB but is unused in the app.
 */
export interface ManagerWorkshopRow {
  id: string;
  name: string;
  subject: string | null;
  status: WorkshopStatusValue;
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

export interface ManagerWorkshopPaymentRow {
  id: string;
  workshop_id: string;
  amount: number;
  type: WorkshopPaymentType;
  payment_date: string;
  payment_method: WorkshopPaymentMethod | string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export type ManagerWorkshopsPageData = {
  workshops: ManagerWorkshopRow[];
};

export type ManagerWorkshopInstructorCandidate = {
  id: string;
  username: string;
};

export type ManagerWorkshopDetailPageData = {
  workshop: ManagerWorkshopRow;
  payment_count: number;
  instructors: ManagerWorkshopInstructorRow[];
  instructorCandidates: ManagerWorkshopInstructorCandidate[];
  documents: ManagerWorkshopDocumentRow[];
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

import type { FieldErrors } from "@/types/auth";
import type {
  GuestCurrentStatus,
  GuestEducationLevel,
  GuestInterestedService,
  GuestStatus,
} from "@/lib/constants/guest";

export interface ManagerGuestRow {
  id: string;
  full_name: string;
  phone: string | null;
  age: number | null;
  school_or_university: string | null;
  education_level: GuestEducationLevel | null;
  interested_service: GuestInterestedService | null;
  status: GuestCurrentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateGuestActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  guest?: ManagerGuestRow;
};

export type UpdateGuestActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  guest?: ManagerGuestRow;
};

export type DeleteGuestActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export interface ManagerGuestStatusEventRow {
  id: string;
  guest_id: string;
  status: GuestStatus;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export type ManagerGuestDetail = {
  guest: ManagerGuestRow;
  statusEvents: ManagerGuestStatusEventRow[];
  registrationInvite: ManagerGuestRegistrationInvite | null;
  registrationApplication: ManagerGuestRegistrationApplicationSummary | null;
};

export type ManagerGuestRegistrationInvite = {
  id: string;
  guest_id: string;
  token: string;
  application_id: string | null;
  created_at: string;
  used_at: string | null;
  cancelled_at: string | null;
  public_url: string;
};

export type ManagerGuestRegistrationApplicationSummary = {
  id: string;
  status: string;
  created_at: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
};

export type ChangeGuestStatusActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  guest?: ManagerGuestRow;
  statusEvents?: ManagerGuestStatusEventRow[];
};

export type RecordGuestStatusesActionState = ChangeGuestStatusActionState;

export type SetGuestProfileStatusActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  guest?: ManagerGuestRow;
};

export type RemoveGuestStatusActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  guest?: ManagerGuestRow;
  statusEvents?: ManagerGuestStatusEventRow[];
  removedStatus?: ManagerGuestStatusEventRow["status"];
};

export type OpenGuestRegistrationInviteActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  invite?: ManagerGuestRegistrationInvite;
};

export type StopGuestRegistrationInviteActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  invite?: ManagerGuestRegistrationInvite;
};

export type CancelGuestRegistrationApplicationActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export type DeleteGuestRegistrationApplicationActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export type SubmitGuestRegistrationStaffActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};

export type GuestRegistrationLinkUserOption = {
  id: string;
  username: string | null;
  email: string;
};

export type ConnectGuestRegistrationUserActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  application?: ManagerGuestRegistrationApplicationSummary;
};

export type CreateStudentFromGuestActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  application?: ManagerGuestRegistrationApplicationSummary;
};

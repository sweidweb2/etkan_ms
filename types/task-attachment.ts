import type {
  TaskAttachmentCloneJobStatus,
  TaskAttachmentEntity,
} from "@/lib/constants/task-attachments";
import type { FieldErrors } from "@/types/auth";

export type TaskAttachmentRow = {
  id: string;
  entity: TaskAttachmentEntity;
  entity_id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string | null;
  sort_order: number;
  created_at: string;
};

export type TaskAttachmentCloneJobRow = {
  id: string;
  class_task_id: string;
  source_subject_task_id: string | null;
  status: TaskAttachmentCloneJobStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type UploadTaskAttachmentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  attachment?: TaskAttachmentRow;
};

export type DeleteTaskAttachmentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};

export type TaskAttachmentSignedUrlActionState = {
  success?: boolean;
  error?: string;
  signedUrl?: string;
  fileName?: string;
};

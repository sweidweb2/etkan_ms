import { TASK_ATTACHMENT_MAX_FILES } from "@/lib/constants/task-attachments";

/**
 * Keep in sync with enforce_task_attachment_max_files() SQL exception text
 * (migration hardcodes the same count + message; see parity test).
 */
export const TASK_ATTACHMENT_MAX_FILES_SQL_MESSAGE =
  `Each task can have at most ${TASK_ATTACHMENT_MAX_FILES} attachments.`;

import { STUDENT_ATTENDANCE_STATUSES } from "@/lib/constants/manager-student-attendance-status";
import { getManagerClassStudentsPreview } from "@/lib/manager/get-manager-class-students-preview";
import { getManagerClassSessionPreview } from "@/lib/manager/get-manager-class-session-preview";
import { getPreviewSessionTasksFromStore } from "@/lib/preview/manager-session-tasks-store";
import type {
  ManagerSessionAttendeeRow,
  ManagerSessionTaskRow,
} from "@/types/manager-class-session-detail";

const TASK_TITLES = [
  "Worksheet",
  "Quiz",
  "Homework",
  "Lab report",
  "Practice problems",
  "Reading summary",
] as const;

const ATTENDANCE_NOTES = [
  null,
  null,
  "Arrived after warm-up",
  "Medical excuse on file",
  "Left early — approved",
] as const;

function hashString(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash + character.charCodeAt(0)) % 997;
  }

  return hash;
}

export function getManagerClassSessionTasksPreview(
  classId: string,
  sessionId: string
): ManagerSessionTaskRow[] {
  const session = getManagerClassSessionPreview(classId, sessionId);

  if (!session) {
    return [];
  }

  const taskCount = 1 + (hashString(`${sessionId}-tasks`) % 3);
  const startsAt = new Date(session.starts_at);
  const storedTasks = getPreviewSessionTasksFromStore(sessionId);

  const mockTasks = Array.from({ length: taskCount }, (_, index) => {
    const order = index + 1;
    const dueDate = new Date(startsAt);
    dueDate.setDate(dueDate.getDate() + order * 2);
    dueDate.setHours(23, 59, 0, 0);

    const createdAt = new Date(startsAt);
    createdAt.setDate(createdAt.getDate() - order);

    const titleBase =
      TASK_TITLES[(session.nb_order + index) % TASK_TITLES.length]!;

    return {
      id: `${sessionId}-task-${order}`,
      session_id: sessionId,
      title: `${titleBase} · S${session.nb_order}`,
      description: `Task ${order} for session S${session.nb_order}.`,
      due_date: dueDate.toISOString(),
      max_grade: 10 + ((session.nb_order + index) % 4) * 5,
      created_at: createdAt.toISOString(),
    };
  });

  const storedIds = new Set(storedTasks.map((task) => task.id));

  return [
    ...storedTasks,
    ...mockTasks.filter((task) => !storedIds.has(task.id)),
  ];
}

export function getManagerClassSessionAttendeesPreview(
  classId: string,
  sessionId: string
): ManagerSessionAttendeeRow[] {
  const session = getManagerClassSessionPreview(classId, sessionId);

  if (!session) {
    return [];
  }

  const students = getManagerClassStudentsPreview(classId);
  const statusValues = [
    STUDENT_ATTENDANCE_STATUSES.PRESENT,
    STUDENT_ATTENDANCE_STATUSES.ABSENT,
    STUDENT_ATTENDANCE_STATUSES.LATE,
    STUDENT_ATTENDANCE_STATUSES.EXCUSED,
  ] as const;

  return students.map((student) => {
    const seed = hashString(`${sessionId}-${student.user_id}`);
    const status = statusValues[seed % statusValues.length]!;
    const note = ATTENDANCE_NOTES[seed % ATTENDANCE_NOTES.length] ?? null;
    const createdAt = new Date(session.starts_at);
    createdAt.setHours(createdAt.getHours() - 2);

    return {
      id: `${sessionId}-attendee-${student.user_id}`,
      session_id: sessionId,
      student_id: student.user_id,
      full_name: student.full_name,
      status,
      note,
      is_active: seed % 6 !== 0,
      created_at: createdAt.toISOString(),
    };
  });
}

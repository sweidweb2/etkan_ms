import type {
  ManagerClassTaskRow,
  ManagerSessionAttendeeRow,
} from "@/types/manager-class-session-detail";

/** Extra data for the student "Team leader" tab (null when not a team leader). */
export type StudentTeamLeaderBundle = {
  tasks: ManagerClassTaskRow[];
  hasComputedGrades: boolean;
  lockedUserIds: string[];
};

/** Classmates' attendance for one session, names only (no email/phone). */
export type TeamLeaderSessionAttendance = {
  sessionId: string;
  attendees: ManagerSessionAttendeeRow[];
  lockedUserIds: string[];
};

export type LoadTeamLeaderSessionAttendanceResult =
  | { success: true; data: TeamLeaderSessionAttendance }
  | { success: false; error: string };

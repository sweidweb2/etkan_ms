export type WeeklyScheduleDay =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export interface ManagerWeeklyScheduleSession {
  id: string;
  className: string;
  subjectName: string;
  teacherName: string;
  room: string;
  day: WeeklyScheduleDay;
  startTime: string;
  endTime: string;
}

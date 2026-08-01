import { CLASS_STATUSES } from "@/lib/constants/manager-class-status";
import type { ManagerStudentClassRow } from "@/types/manager-student-class";

const DEFAULT_STUDENT_CLASSES: ManagerStudentClassRow[] = [
  {
    id: "sc-default-1",
    class_id: "cls-default-1",
    name: "Math Fundamentals A",
    subject_name: "Mathematics",
    class_status: CLASS_STATUSES.IN_PROGRESS,
    joined_at: "2025-09-15T08:00:00.000Z",
  },
  {
    id: "sc-default-2",
    class_id: "cls-default-2",
    name: "English Composition",
    subject_name: "English",
    class_status: CLASS_STATUSES.PAUSED,
    joined_at: "2025-10-01T10:00:00.000Z",
  },
  {
    id: "sc-default-3",
    class_id: "cls-default-3",
    name: "Physics Lab",
    subject_name: "Physics",
    class_status: CLASS_STATUSES.IN_PROGRESS,
    joined_at: "2025-10-12T14:30:00.000Z",
  },
  {
    id: "sc-default-4",
    class_id: "cls-default-4",
    name: "World History",
    subject_name: "History",
    class_status: CLASS_STATUSES.DONE,
    joined_at: "2025-08-20T09:00:00.000Z",
  },
];

/** Preview joined classes keyed by student_profile_id. */
export const MANAGER_STUDENT_CLASSES_MOCK: Record<
  string,
  ManagerStudentClassRow[]
> = {
  "s1a2b3c4-d5e6-7890-abcd-ef1234567890": [
    {
      id: "sc-sara-1",
      class_id: "cls-math-adv",
      name: "Advanced Algebra II",
      subject_name: "Mathematics",
      class_status: CLASS_STATUSES.IN_PROGRESS,
      joined_at: "2025-09-12T08:30:00.000Z",
    },
    {
      id: "sc-sara-2",
      class_id: "cls-eng-lit",
      name: "English Literature",
      subject_name: "English",
      class_status: CLASS_STATUSES.IN_PROGRESS,
      joined_at: "2025-09-12T08:30:00.000Z",
    },
    {
      id: "sc-sara-3",
      class_id: "cls-phys-1",
      name: "Physics — Mechanics",
      subject_name: "Physics",
      class_status: CLASS_STATUSES.IN_PROGRESS,
      joined_at: "2025-09-20T11:00:00.000Z",
    },
    {
      id: "sc-sara-4",
      class_id: "cls-chem-org",
      name: "Organic Chemistry Intro",
      subject_name: "Chemistry",
      class_status: CLASS_STATUSES.PAUSED,
      joined_at: "2025-11-05T09:15:00.000Z",
    },
    {
      id: "sc-sara-5",
      class_id: "cls-bio-cell",
      name: "Cell Biology",
      subject_name: "Biology",
      class_status: CLASS_STATUSES.IN_PROGRESS,
      joined_at: "2025-10-02T13:45:00.000Z",
    },
    {
      id: "sc-sara-6",
      class_id: "cls-cs-py",
      name: "Python Programming",
      subject_name: "Computer Science",
      class_status: CLASS_STATUSES.DONE,
      joined_at: "2025-06-01T07:00:00.000Z",
    },
    {
      id: "sc-sara-7",
      class_id: "cls-art-studio",
      name: "Studio Art & Design",
      subject_name: "Fine Arts",
      class_status: CLASS_STATUSES.PAUSED,
      joined_at: "2025-09-25T15:20:00.000Z",
    },
    {
      id: "sc-sara-8",
      class_id: "cls-pe-fit",
      name: "Physical Education",
      subject_name: "Sports",
      class_status: CLASS_STATUSES.DONE,
      joined_at: "2025-09-12T08:30:00.000Z",
    },
  ],
  "s2b3c4d5-e6f7-8901-bcde-f12345678901": [
    {
      id: "sc-omar-1",
      class_id: "cls-math-geo",
      name: "Geometry",
      subject_name: "Mathematics",
      class_status: CLASS_STATUSES.IN_PROGRESS,
      joined_at: "2025-09-14T10:45:00.000Z",
    },
    {
      id: "sc-omar-2",
      class_id: "cls-eng-write",
      name: "Creative Writing",
      subject_name: "English",
      class_status: CLASS_STATUSES.IN_PROGRESS,
      joined_at: "2025-09-14T10:45:00.000Z",
    },
    {
      id: "sc-omar-3",
      class_id: "cls-hist-mod",
      name: "Modern History",
      subject_name: "History",
      class_status: CLASS_STATUSES.PAUSED,
      joined_at: "2025-11-01T08:00:00.000Z",
    },
    {
      id: "sc-omar-4",
      class_id: "cls-music-theory",
      name: "Music Theory",
      subject_name: "Music",
      class_status: CLASS_STATUSES.IN_PROGRESS,
      joined_at: "2025-10-10T12:00:00.000Z",
    },
    {
      id: "sc-omar-5",
      class_id: "cls-arabic-lit",
      name: "Arabic Literature",
      subject_name: "Arabic",
      class_status: CLASS_STATUSES.DONE,
      joined_at: "2025-05-18T09:00:00.000Z",
    },
    {
      id: "sc-omar-6",
      class_id: "cls-pe-swim",
      name: "Swimming",
      subject_name: "Sports",
      class_status: CLASS_STATUSES.DONE,
      joined_at: "2025-04-02T08:00:00.000Z",
    },
  ],
};

export function getDefaultStudentClasses(): ManagerStudentClassRow[] {
  return DEFAULT_STUDENT_CLASSES.map((item) => ({ ...item }));
}

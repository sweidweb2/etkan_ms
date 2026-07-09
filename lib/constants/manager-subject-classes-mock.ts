import type { ManagerSubjectClassRow } from "@/types/manager-subject-class";
import { getPreviewClassStatus } from "@/lib/constants/manager-class-status";

const MANAGER_SUBJECT_CLASSES_MOCK_RAW: Omit<ManagerSubjectClassRow, "status">[] = [
  {
    id: "cls-sub-001-1",
    subject_id: "sub-001-math-advanced",
    name: "Advanced Algebra II",
    created_at: "2025-08-15T09:00:00.000Z",
  },
  {
    id: "cls-sub-001-2",
    subject_id: "sub-001-math-advanced",
    name: "Calculus Prep",
    created_at: "2025-08-20T10:00:00.000Z",
  },
  {
    id: "cls-sub-001-3",
    subject_id: "sub-001-math-advanced",
    name: "Statistics Bridge",
    created_at: "2025-09-01T11:00:00.000Z",
  },
  {
    id: "cls-sub-001-4",
    subject_id: "sub-001-math-advanced",
    name: "Math Lab",
    created_at: "2025-09-10T12:00:00.000Z",
  },
  {
    id: "cls-sub-002-1",
    subject_id: "sub-002-physics",
    name: "Physics â€” Mechanics",
    created_at: "2025-08-18T09:00:00.000Z",
  },
  {
    id: "cls-sub-002-2",
    subject_id: "sub-002-physics",
    name: "Physics â€” Waves",
    created_at: "2025-08-25T10:00:00.000Z",
  },
  {
    id: "cls-sub-002-3",
    subject_id: "sub-002-physics",
    name: "Physics Lab",
    created_at: "2025-09-05T11:00:00.000Z",
  },
  {
    id: "cls-sub-003-1",
    subject_id: "sub-003-chemistry",
    name: "General Chemistry",
    created_at: "2025-08-22T09:00:00.000Z",
  },
  {
    id: "cls-sub-003-2",
    subject_id: "sub-003-chemistry",
    name: "Organic Chemistry Intro",
    created_at: "2025-09-02T10:00:00.000Z",
  },
  {
    id: "cls-sub-004-1",
    subject_id: "sub-004-biology",
    name: "Cell Biology",
    created_at: "2025-08-28T09:00:00.000Z",
  },
  {
    id: "cls-sub-004-2",
    subject_id: "sub-004-biology",
    name: "Human Anatomy",
    created_at: "2025-09-03T10:00:00.000Z",
  },
  {
    id: "cls-sub-004-3",
    subject_id: "sub-004-biology",
    name: "Ecology Basics",
    created_at: "2025-09-08T11:00:00.000Z",
  },
  {
    id: "cls-sub-004-4",
    subject_id: "sub-004-biology",
    name: "Biology Lab",
    created_at: "2025-09-12T12:00:00.000Z",
  },
  {
    id: "cls-sub-004-5",
    subject_id: "sub-004-biology",
    name: "Genetics Seminar",
    created_at: "2025-09-18T13:00:00.000Z",
  },
  {
    id: "cls-sub-005-1",
    subject_id: "sub-005-english",
    name: "English Literature A",
    created_at: "2025-09-01T09:00:00.000Z",
  },
  {
    id: "cls-sub-005-2",
    subject_id: "sub-005-english",
    name: "English Literature B",
    created_at: "2025-09-04T10:00:00.000Z",
  },
  {
    id: "cls-sub-005-3",
    subject_id: "sub-005-english",
    name: "Creative Writing",
    created_at: "2025-09-07T11:00:00.000Z",
  },
  {
    id: "cls-sub-005-4",
    subject_id: "sub-005-english",
    name: "Poetry Workshop",
    created_at: "2025-09-11T12:00:00.000Z",
  },
  {
    id: "cls-sub-005-5",
    subject_id: "sub-005-english",
    name: "Drama Studies",
    created_at: "2025-09-14T13:00:00.000Z",
  },
  {
    id: "cls-sub-005-6",
    subject_id: "sub-005-english",
    name: "Reading Comprehension",
    created_at: "2025-09-20T14:00:00.000Z",
  },
  {
    id: "cls-sub-006-1",
    subject_id: "sub-006-arabic",
    name: "Arabic Grammar",
    created_at: "2025-09-05T09:00:00.000Z",
  },
  {
    id: "cls-sub-008-1",
    subject_id: "sub-008-computer-science",
    name: "Python Programming",
    created_at: "2025-09-02T09:00:00.000Z",
  },
  {
    id: "cls-sub-008-2",
    subject_id: "sub-008-computer-science",
    name: "Data Structures",
    created_at: "2025-09-06T10:00:00.000Z",
  },
  {
    id: "cls-sub-008-3",
    subject_id: "sub-008-computer-science",
    name: "Web Development",
    created_at: "2025-09-10T11:00:00.000Z",
  },
  {
    id: "cls-sub-008-4",
    subject_id: "sub-008-computer-science",
    name: "Algorithms I",
    created_at: "2025-09-14T12:00:00.000Z",
  },
  {
    id: "cls-sub-008-5",
    subject_id: "sub-008-computer-science",
    name: "Algorithms II",
    created_at: "2025-09-18T13:00:00.000Z",
  },
  {
    id: "cls-sub-008-6",
    subject_id: "sub-008-computer-science",
    name: "CS Lab",
    created_at: "2025-09-22T14:00:00.000Z",
  },
  {
    id: "cls-sub-008-7",
    subject_id: "sub-008-computer-science",
    name: "Intro to Databases",
    created_at: "2025-09-26T15:00:00.000Z",
  },
  {
    id: "cls-sub-009-1",
    subject_id: "sub-009-art",
    name: "Studio Art & Design",
    created_at: "2025-09-08T09:00:00.000Z",
  },
  {
    id: "cls-sub-009-2",
    subject_id: "sub-009-art",
    name: "Digital Illustration",
    created_at: "2025-09-15T10:00:00.000Z",
  },
  {
    id: "cls-sub-010-1",
    subject_id: "sub-010-music",
    name: "Music Theory Fundamentals",
    created_at: "2025-09-12T09:00:00.000Z",
  },
  {
    id: "cls-sub-011-1",
    subject_id: "sub-011-economics",
    name: "Microeconomics",
    created_at: "2025-09-10T09:00:00.000Z",
  },
  {
    id: "cls-sub-011-2",
    subject_id: "sub-011-economics",
    name: "Macroeconomics",
    created_at: "2025-09-16T10:00:00.000Z",
  },
  {
    id: "cls-sub-011-3",
    subject_id: "sub-011-economics",
    name: "Business Finance",
    created_at: "2025-09-22T11:00:00.000Z",
  },
  {
    id: "cls-sub-012-1",
    subject_id: "sub-012-geography",
    name: "Physical Geography",
    created_at: "2025-09-14T09:00:00.000Z",
  },
  {
    id: "cls-sub-012-2",
    subject_id: "sub-012-geography",
    name: "Human Geography",
    created_at: "2025-09-21T10:00:00.000Z",
  },
  {
    id: "cls-sub-014-1",
    subject_id: "sub-014-pe",
    name: "Fitness Training",
    created_at: "2025-09-18T09:00:00.000Z",
  },
  {
    id: "cls-sub-014-2",
    subject_id: "sub-014-pe",
    name: "Swimming",
    created_at: "2025-09-20T10:00:00.000Z",
  },
  {
    id: "cls-sub-014-3",
    subject_id: "sub-014-pe",
    name: "Team Sports",
    created_at: "2025-09-24T11:00:00.000Z",
  },
  {
    id: "cls-sub-014-4",
    subject_id: "sub-014-pe",
    name: "Athletics Club",
    created_at: "2025-09-28T12:00:00.000Z",
  },
  {
    id: "cls-sub-015-1",
    subject_id: "sub-015-robotics",
    name: "Robotics Foundations",
    created_at: "2025-09-25T09:00:00.000Z",
  },
  {
    id: "cls-sub-015-2",
    subject_id: "sub-015-robotics",
    name: "Automation Systems",
    created_at: "2025-09-26T10:00:00.000Z",
  },
  {
    id: "cls-sub-015-3",
    subject_id: "sub-015-robotics",
    name: "Embedded Programming",
    created_at: "2025-09-27T11:00:00.000Z",
  },
  {
    id: "cls-sub-015-4",
    subject_id: "sub-015-robotics",
    name: "Mechanical Design",
    created_at: "2025-09-28T12:00:00.000Z",
  },
  {
    id: "cls-sub-015-5",
    subject_id: "sub-015-robotics",
    name: "Robotics Lab A",
    created_at: "2025-09-29T13:00:00.000Z",
  },
  {
    id: "cls-sub-015-6",
    subject_id: "sub-015-robotics",
    name: "Robotics Lab B",
    created_at: "2025-09-30T14:00:00.000Z",
  },
  {
    id: "cls-sub-015-7",
    subject_id: "sub-015-robotics",
    name: "Competition Team",
    created_at: "2025-10-01T15:00:00.000Z",
  },
  {
    id: "cls-sub-015-8",
    subject_id: "sub-015-robotics",
    name: "Advanced Projects",
    created_at: "2025-10-02T16:00:00.000Z",
  },
];

export const MANAGER_SUBJECT_CLASSES_MOCK: ManagerSubjectClassRow[] =
  MANAGER_SUBJECT_CLASSES_MOCK_RAW.map((classRow, index) => ({
    ...classRow,
    status: getPreviewClassStatus(index),
  }));

export function getManagerSubjectClassesPreview(
  subjectId: string
): ManagerSubjectClassRow[] {
  return MANAGER_SUBJECT_CLASSES_MOCK.filter(
    (classRow) => classRow.subject_id === subjectId
  );
}

import type { ManagerClassOption } from "@/types/manager-class";

export const MANAGER_CLASSES_MOCK: ManagerClassOption[] = [
  {
    class_id: "cls-math-adv",
    name: "Advanced Algebra II",
    subject_name: "Mathematics",
  },
  {
    class_id: "cls-eng-lit",
    name: "English Literature",
    subject_name: "English",
  },
  {
    class_id: "cls-phys-1",
    name: "Physics — Mechanics",
    subject_name: "Physics",
  },
  {
    class_id: "cls-chem-org",
    name: "Organic Chemistry Intro",
    subject_name: "Chemistry",
  },
  {
    class_id: "cls-bio-cell",
    name: "Cell Biology",
    subject_name: "Biology",
  },
  {
    class_id: "cls-cs-py",
    name: "Python Programming",
    subject_name: "Computer Science",
  },
  {
    class_id: "cls-art-studio",
    name: "Studio Art & Design",
    subject_name: "Fine Arts",
  },
  {
    class_id: "cls-pe-fit",
    name: "Physical Education",
    subject_name: "Sports",
  },
  {
    class_id: "cls-math-geo",
    name: "Geometry",
    subject_name: "Mathematics",
  },
  {
    class_id: "cls-eng-write",
    name: "Creative Writing",
    subject_name: "English",
  },
  {
    class_id: "cls-hist-mod",
    name: "Modern History",
    subject_name: "History",
  },
  {
    class_id: "cls-music-theory",
    name: "Music Theory",
    subject_name: "Music",
  },
  {
    class_id: "cls-arabic-lit",
    name: "Arabic Literature",
    subject_name: "Arabic",
  },
  {
    class_id: "cls-pe-swim",
    name: "Swimming",
    subject_name: "Sports",
  },
  {
    class_id: "cls-default-1",
    name: "Math Fundamentals A",
    subject_name: "Mathematics",
  },
  {
    class_id: "cls-default-2",
    name: "English Composition",
    subject_name: "English",
  },
  {
    class_id: "cls-default-3",
    name: "Physics Lab",
    subject_name: "Physics",
  },
  {
    class_id: "cls-default-4",
    name: "World History",
    subject_name: "History",
  },
  {
    class_id: "cls-stats-1",
    name: "Statistics I",
    subject_name: "Mathematics",
  },
  {
    class_id: "cls-econ-intro",
    name: "Intro to Economics",
    subject_name: "Social Studies",
  },
  {
    class_id: "cls-french-a1",
    name: "French A1",
    subject_name: "Languages",
  },
];

export function getManagerClassOption(classId: string): ManagerClassOption | undefined {
  return MANAGER_CLASSES_MOCK.find((item) => item.class_id === classId);
}

import fs from "node:fs";

const roster = [
  ["stu-001", "Ahmed Hassan"],
  ["stu-002", "Sara Ali"],
  ["stu-003", "Omar Mahmoud"],
  ["stu-004", "Layla Ibrahim"],
  ["stu-005", "Youssef Saleh"],
  ["stu-006", "Nour Nasser"],
  ["stu-007", "Karim Farouk"],
  ["stu-008", "Maya Aziz"],
  ["stu-009", "Hassan Hamza"],
  ["stu-010", "Rania Zaki"],
];

const classes = [
  "cls-sub-001-1",
  "cls-sub-001-2",
  "cls-sub-001-3",
  "cls-sub-001-4",
  "cls-sub-002-1",
  "cls-sub-002-2",
  "cls-sub-002-3",
  "cls-sub-003-1",
  "cls-sub-003-2",
  "cls-sub-004-1",
  "cls-sub-004-2",
  "cls-sub-004-3",
  "cls-sub-004-4",
  "cls-sub-004-5",
  "cls-sub-005-1",
  "cls-sub-005-2",
  "cls-sub-005-3",
  "cls-sub-005-4",
  "cls-sub-005-5",
  "cls-sub-005-6",
  "cls-sub-006-1",
  "cls-sub-008-1",
  "cls-sub-008-2",
  "cls-sub-008-3",
  "cls-sub-008-4",
  "cls-sub-008-5",
  "cls-sub-008-6",
  "cls-sub-008-7",
  "cls-sub-009-1",
  "cls-sub-009-2",
  "cls-sub-010-1",
  "cls-sub-011-1",
  "cls-sub-011-2",
  "cls-sub-011-3",
  "cls-sub-012-1",
  "cls-sub-012-2",
  "cls-sub-014-1",
  "cls-sub-014-2",
  "cls-sub-014-3",
  "cls-sub-014-4",
  "cls-sub-015-1",
  "cls-sub-015-2",
  "cls-sub-015-3",
  "cls-sub-015-4",
  "cls-sub-015-5",
  "cls-sub-015-6",
  "cls-sub-015-7",
  "cls-sub-015-8",
];

const presets = {
  "cls-sub-001-1": [94, 88, 82, 79, 75, 71, 68, 91, 85, 77],
  "cls-sub-001-2": [91, 86, 83, 80, 76, 72, 69, 89, 84, 78],
  "cls-sub-001-3": [89, 85, 81, 78, 74, 70, 66, 87, 82, 75],
  "cls-sub-001-4": [76, 73, 70, 68, 65, 62, 60, 74, 71, 69],
  "cls-sub-002-1": [92, 87, 84, 81, 77, 73, 70, 88, 83, 79],
  "cls-sub-008-1": [95, 90, 86, 83, 79, 75, 72, 93, 87, 80],
};

const out = {};

classes.forEach((id, classIndex) => {
  const grades =
    presets[id] ??
    roster.map((_, studentIndex) =>
      Math.round(
        (62 + ((classIndex * 7 + studentIndex * 11) % 34) + (studentIndex % 3) * 2.5) *
          10
      ) / 10
    );

  out[id] = roster
    .map(([studentId, studentName], studentIndex) => ({
      studentId: `${studentId}-${id}`,
      studentName,
      finalGrade: grades[studentIndex] ?? 70,
    }))
    .sort((left, right) => right.finalGrade - left.finalGrade);
});

const content = `// Preview-only dummy student grades per class.
import type { ManagerClassStudentGrade } from "@/types/manager-subject-grade";

export const MANAGER_CLASS_STUDENT_GRADES_MOCK: Record<
  string,
  ManagerClassStudentGrade[]
> = ${JSON.stringify(out, null, 2)};
`;

fs.writeFileSync("lib/constants/manager-subject-student-grades-data.ts", content);
console.log(`Wrote ${Object.keys(out).length} class grade sets.`);

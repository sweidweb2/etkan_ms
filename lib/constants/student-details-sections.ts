/** Scroll targets on the manager student details page. */
export const STUDENT_DETAILS_SECTION_IDS = {
  classes: "student-details-classes",
  borrowing: "student-details-borrowing",
  account: "student-details-account",
} as const;

export function scrollToStudentDetailsSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

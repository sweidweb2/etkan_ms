/** Scroll targets on the manager student details page. */
export const STUDENT_DETAILS_SECTION_IDS = {
  classes: "student-details-classes",
  borrowing: "student-details-borrowing",
  activity: "student-details-activity",
} as const;

export function scrollToStudentDetailsSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

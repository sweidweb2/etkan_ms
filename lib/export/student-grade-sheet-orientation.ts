export type StudentGradeSheetOrientation = "horizontal" | "vertical";

export function getGradeSheetAspectClass(
  orientation: StudentGradeSheetOrientation
): string {
  return orientation === "horizontal" ? "aspect-[297/210]" : "aspect-[210/297]";
}

export function getGradeSheetMaxWidthClass(
  orientation: StudentGradeSheetOrientation
): string {
  return orientation === "horizontal" ? "max-w-5xl" : "max-w-md";
}

export function getJsPdfOrientation(
  orientation: StudentGradeSheetOrientation
): "landscape" | "portrait" {
  return orientation === "horizontal" ? "landscape" : "portrait";
}

export function getDocPageSizeCss(
  orientation: StudentGradeSheetOrientation
): string {
  return orientation === "horizontal"
    ? "size: A4 landscape; margin: 10mm;"
    : "size: A4 portrait; margin: 10mm;";
}

export function isVerticalGradeSheetOrientation(
  orientation: StudentGradeSheetOrientation
): boolean {
  return orientation === "vertical";
}

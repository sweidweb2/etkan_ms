"use client";

import { useCallback, useRef } from "react";
import { YES_NO_MAX_GRADE } from "@/lib/constants/task-yes-no";

type MaxGradeValue = "" | number | undefined;

/** Forces max grade to 100 while Yes/No is on and restores the prior value when turned off. */
export function useTaskYesNoToggle({
  getMaxGrade,
  setMaxGrade,
  setIsYesNo,
}: {
  /** Raw form value (coerced inputs may hold strings). */
  getMaxGrade: () => unknown;
  setMaxGrade: (value: unknown) => void;
  setIsYesNo: (value: boolean) => void;
}) {
  const previousMaxGradeRef = useRef<unknown>(undefined);

  const onYesNoChange = useCallback(
    (nextIsYesNo: boolean) => {
      if (nextIsYesNo) {
        previousMaxGradeRef.current = getMaxGrade();
        setMaxGrade(YES_NO_MAX_GRADE);
      } else {
        setMaxGrade(previousMaxGradeRef.current ?? YES_NO_MAX_GRADE);
        previousMaxGradeRef.current = undefined;
      }
      setIsYesNo(nextIsYesNo);
    },
    [getMaxGrade, setMaxGrade, setIsYesNo]
  );

  const resetYesNoToggle = useCallback(() => {
    previousMaxGradeRef.current = undefined;
  }, []);

  return { onYesNoChange, resetYesNoToggle };
}

export function serializeTaskMaxGrade(
  maxGrade: MaxGradeValue,
  isYesNo: boolean | undefined
): string {
  if (isYesNo) {
    return String(YES_NO_MAX_GRADE);
  }
  return maxGrade === undefined || maxGrade === "" ? "" : String(maxGrade);
}

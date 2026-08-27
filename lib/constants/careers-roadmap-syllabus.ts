import type { MessageKey } from "@/lib/i18n/messages";
import type { CareersRoadmapStageId } from "@/lib/constants/careers-roadmaps";

export type CareersSyllabusMilestone = {
  id: string;
  titleKey: MessageKey;
};

export type CareersSyllabusCourse = {
  id: string;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  milestones: CareersSyllabusMilestone[];
};

export type CareersStageSyllabus = {
  stageId: CareersRoadmapStageId;
  courses: CareersSyllabusCourse[];
};

/**
 * Static syllabus per roadmap stage.
 * Course cards introduce a course; milestone cards list its syllabus steps.
 */
export const CAREERS_STAGE_SYLLABI: CareersStageSyllabus[] = [
  {
    stageId: "stage-1",
    courses: [
      {
        id: "intro-to-programming",
        titleKey: "careers.syllabus.s1.programming.title",
        bodyKey: "careers.syllabus.s1.programming.body",
        milestones: [
          { id: "basics", titleKey: "careers.syllabus.s1.programming.m.basics" },
          {
            id: "if-condition",
            titleKey: "careers.syllabus.s1.programming.m.ifCondition",
          },
          { id: "loops", titleKey: "careers.syllabus.s1.programming.m.loops" },
          { id: "arrays", titleKey: "careers.syllabus.s1.programming.m.arrays" },
          {
            id: "functions",
            titleKey: "careers.syllabus.s1.programming.m.functions",
          },
          {
            id: "debugging",
            titleKey: "careers.syllabus.s1.programming.m.debugging",
          },
          { id: "strings", titleKey: "careers.syllabus.s1.programming.m.strings" },
          { id: "classes", titleKey: "careers.syllabus.s1.programming.m.classes" },
          {
            id: "data-structures",
            titleKey: "careers.syllabus.s1.programming.m.dataStructures",
          },
          {
            id: "problem-solving",
            titleKey: "careers.syllabus.s1.programming.m.problemSolving",
          },
          {
            id: "leetcode",
            titleKey: "careers.syllabus.s1.programming.m.leetcode",
          },
        ],
      },
      {
        id: "arduino",
        titleKey: "careers.syllabus.s1.arduino.title",
        bodyKey: "careers.syllabus.s1.arduino.body",
        milestones: [],
      },
      {
        id: "security",
        titleKey: "careers.syllabus.s1.security.title",
        bodyKey: "careers.syllabus.s1.security.body",
        milestones: [],
      },
    ],
  },
];

export function getCareersStageSyllabus(
  stageId: CareersRoadmapStageId
): CareersStageSyllabus | null {
  return (
    CAREERS_STAGE_SYLLABI.find((syllabus) => syllabus.stageId === stageId) ??
    null
  );
}

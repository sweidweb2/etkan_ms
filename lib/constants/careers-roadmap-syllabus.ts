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
  /** Shown above the course list, for stages that need extra framing. */
  noteKey?: MessageKey;
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
        milestones: [
          {
            id: "electricity",
            titleKey: "careers.syllabus.s1.arduino.m.electricity",
          },
          { id: "mcu-ide", titleKey: "careers.syllabus.s1.arduino.m.mcuIde" },
          { id: "io", titleKey: "careers.syllabus.s1.arduino.m.io" },
          {
            id: "breadboard",
            titleKey: "careers.syllabus.s1.arduino.m.breadboard",
          },
          { id: "serial", titleKey: "careers.syllabus.s1.arduino.m.serial" },
          { id: "motors", titleKey: "careers.syllabus.s1.arduino.m.motors" },
          {
            id: "block-diagrams",
            titleKey: "careers.syllabus.s1.arduino.m.blockDiagrams",
          },
          { id: "power", titleKey: "careers.syllabus.s1.arduino.m.power" },
          {
            id: "libraries",
            titleKey: "careers.syllabus.s1.arduino.m.libraries",
          },
          {
            id: "protocols",
            titleKey: "careers.syllabus.s1.arduino.m.protocols",
          },
          {
            id: "architecture",
            titleKey: "careers.syllabus.s1.arduino.m.architecture",
          },
          { id: "embedded", titleKey: "careers.syllabus.s1.arduino.m.embedded" },
        ],
      },
      {
        id: "data-and-computer",
        titleKey: "careers.syllabus.s1.dataComputer.title",
        bodyKey: "careers.syllabus.s1.dataComputer.body",
        milestones: [],
      },
    ],
  },
  {
    stageId: "stage-2",
    courses: [
      {
        id: "tools-and-soldering",
        titleKey: "careers.syllabus.s2.toolsSoldering.title",
        bodyKey: "careers.syllabus.s2.toolsSoldering.body",
        milestones: [
          {
            id: "fundamentals",
            titleKey: "careers.syllabus.s2.toolsSoldering.m.fundamentals",
          },
          { id: "smd", titleKey: "careers.syllabus.s2.toolsSoldering.m.smd" },
          { id: "pads", titleKey: "careers.syllabus.s2.toolsSoldering.m.pads" },
          {
            id: "hand-tools",
            titleKey: "careers.syllabus.s2.toolsSoldering.m.handTools",
          },
          {
            id: "multimeter",
            titleKey: "careers.syllabus.s2.toolsSoldering.m.multimeter",
          },
          {
            id: "oscilloscope",
            titleKey: "careers.syllabus.s2.toolsSoldering.m.oscilloscope",
          },
          {
            id: "power-supply",
            titleKey: "careers.syllabus.s2.toolsSoldering.m.powerSupply",
          },
        ],
      },
      {
        id: "solidworks",
        titleKey: "careers.syllabus.s2.solidworks.title",
        bodyKey: "careers.syllabus.s2.solidworks.body",
        milestones: [
          {
            id: "interface",
            titleKey: "careers.syllabus.s2.solidworks.m.interface",
          },
          {
            id: "features",
            titleKey: "careers.syllabus.s2.solidworks.m.features",
          },
          {
            id: "model-mania",
            titleKey: "careers.syllabus.s2.solidworks.m.modelMania",
          },
          {
            id: "reverse-engineering",
            titleKey: "careers.syllabus.s2.solidworks.m.reverseEngineering",
          },
          { id: "dfm", titleKey: "careers.syllabus.s2.solidworks.m.dfm" },
          {
            id: "assembly",
            titleKey: "careers.syllabus.s2.solidworks.m.assembly",
          },
          {
            id: "advanced",
            titleKey: "careers.syllabus.s2.solidworks.m.advanced",
          },
          { id: "cswp", titleKey: "careers.syllabus.s2.solidworks.m.cswp" },
        ],
      },
      {
        id: "3d-printing",
        titleKey: "careers.syllabus.s2.printing3d.title",
        bodyKey: "careers.syllabus.s2.printing3d.body",
        milestones: [
          {
            id: "fundamentals",
            titleKey: "careers.syllabus.s2.printing3d.m.fundamentals",
          },
          {
            id: "calibration",
            titleKey: "careers.syllabus.s2.printing3d.m.calibration",
          },
          {
            id: "finishing",
            titleKey: "careers.syllabus.s2.printing3d.m.finishing",
          },
        ],
      },
      {
        id: "circuits-and-power",
        titleKey: "careers.syllabus.s2.circuitsPower.title",
        bodyKey: "careers.syllabus.s2.circuitsPower.body",
        milestones: [
          {
            id: "fundamentals",
            titleKey: "careers.syllabus.s2.circuitsPower.m.fundamentals",
          },
          {
            id: "lithium",
            titleKey: "careers.syllabus.s2.circuitsPower.m.lithium",
          },
          {
            id: "pack-design",
            titleKey: "careers.syllabus.s2.circuitsPower.m.packDesign",
          },
          { id: "bms", titleKey: "careers.syllabus.s2.circuitsPower.m.bms" },
          {
            id: "spot-welding",
            titleKey: "careers.syllabus.s2.circuitsPower.m.spotWelding",
          },
        ],
      },
    ],
  },
  {
    stageId: "stage-3",
    courses: [
      {
        id: "web-development",
        titleKey: "careers.syllabus.s3.web.title",
        bodyKey: "careers.syllabus.s3.web.body",
        milestones: [
          { id: "internet", titleKey: "careers.syllabus.s3.web.m.internet" },
          { id: "html", titleKey: "careers.syllabus.s3.web.m.html" },
          { id: "css", titleKey: "careers.syllabus.s3.web.m.css" },
          { id: "flexbox", titleKey: "careers.syllabus.s3.web.m.flexbox" },
          {
            id: "advanced-css",
            titleKey: "careers.syllabus.s3.web.m.advancedCss",
          },
          { id: "js-basics", titleKey: "careers.syllabus.s3.web.m.jsBasics" },
          { id: "dom", titleKey: "careers.syllabus.s3.web.m.dom" },
          { id: "modern-js", titleKey: "careers.syllabus.s3.web.m.modernJs" },
          { id: "async", titleKey: "careers.syllabus.s3.web.m.async" },
          { id: "react", titleKey: "careers.syllabus.s3.web.m.react" },
          {
            id: "react-advanced",
            titleKey: "careers.syllabus.s3.web.m.reactAdvanced",
          },
        ],
      },
      {
        id: "mobile-development",
        titleKey: "careers.syllabus.s3.mobile.title",
        bodyKey: "careers.syllabus.s3.mobile.body",
        milestones: [
          { id: "dart", titleKey: "careers.syllabus.s3.mobile.m.dart" },
          { id: "oop", titleKey: "careers.syllabus.s3.mobile.m.oop" },
          { id: "widgets", titleKey: "careers.syllabus.s3.mobile.m.widgets" },
          { id: "github", titleKey: "careers.syllabus.s3.mobile.m.github" },
          { id: "layout", titleKey: "careers.syllabus.s3.mobile.m.layout" },
          {
            id: "navigation",
            titleKey: "careers.syllabus.s3.mobile.m.navigation",
          },
          { id: "state", titleKey: "careers.syllabus.s3.mobile.m.state" },
          { id: "api", titleKey: "careers.syllabus.s3.mobile.m.api" },
          { id: "storage", titleKey: "careers.syllabus.s3.mobile.m.storage" },
          { id: "provider", titleKey: "careers.syllabus.s3.mobile.m.provider" },
          { id: "firebase", titleKey: "careers.syllabus.s3.mobile.m.firebase" },
          {
            id: "architecture",
            titleKey: "careers.syllabus.s3.mobile.m.architecture",
          },
        ],
      },
      {
        id: "vibe-coding",
        titleKey: "careers.syllabus.s3.vibeCoding.title",
        bodyKey: "careers.syllabus.s3.vibeCoding.body",
        milestones: [
          {
            id: "prompting",
            titleKey: "careers.syllabus.s3.vibeCoding.m.prompting",
          },
          {
            id: "animation",
            titleKey: "careers.syllabus.s3.vibeCoding.m.animation",
          },
          { id: "rag", titleKey: "careers.syllabus.s3.vibeCoding.m.rag" },
        ],
      },
      {
        id: "backend-development",
        titleKey: "careers.syllabus.s3.backend.title",
        bodyKey: "careers.syllabus.s3.backend.body",
        milestones: [
          { id: "intro", titleKey: "careers.syllabus.s3.backend.m.intro" },
          { id: "routes", titleKey: "careers.syllabus.s3.backend.m.routes" },
          {
            id: "connections",
            titleKey: "careers.syllabus.s3.backend.m.connections",
          },
          { id: "sql", titleKey: "careers.syllabus.s3.backend.m.sql" },
          { id: "database", titleKey: "careers.syllabus.s3.backend.m.database" },
          { id: "crud", titleKey: "careers.syllabus.s3.backend.m.crud" },
          {
            id: "relationships",
            titleKey: "careers.syllabus.s3.backend.m.relationships",
          },
          { id: "auth", titleKey: "careers.syllabus.s3.backend.m.auth" },
          { id: "storage", titleKey: "careers.syllabus.s3.backend.m.storage" },
          { id: "security", titleKey: "careers.syllabus.s3.backend.m.security" },
          { id: "linux", titleKey: "careers.syllabus.s3.backend.m.linux" },
          {
            id: "deployment",
            titleKey: "careers.syllabus.s3.backend.m.deployment",
          },
        ],
      },
    ],
  },
  {
    stageId: "stage-4",
    noteKey: "careers.syllabus.s4.note",
    courses: [],
  },
  {
    stageId: "stage-5",
    courses: [
      {
        id: "altium-and-electronics",
        titleKey: "careers.syllabus.s5.altium.title",
        bodyKey: "careers.syllabus.s5.altium.body",
        milestones: [
          {
            id: "circuit-theory",
            titleKey: "careers.syllabus.s5.altium.m.circuitTheory",
          },
          { id: "ac-dc", titleKey: "careers.syllabus.s5.altium.m.acdc" },
          {
            id: "altium-basics",
            titleKey: "careers.syllabus.s5.altium.m.altiumBasics",
          },
          {
            id: "transistors",
            titleKey: "careers.syllabus.s5.altium.m.transistors",
          },
          {
            id: "components",
            titleKey: "careers.syllabus.s5.altium.m.components",
          },
          {
            id: "digital-logic",
            titleKey: "careers.syllabus.s5.altium.m.digitalLogic",
          },
          {
            id: "combinational",
            titleKey: "careers.syllabus.s5.altium.m.combinational",
          },
          {
            id: "logic-design",
            titleKey: "careers.syllabus.s5.altium.m.logicDesign",
          },
          { id: "mcu", titleKey: "careers.syllabus.s5.altium.m.mcu" },
          { id: "layout", titleKey: "careers.syllabus.s5.altium.m.layout" },
        ],
      },
    ],
  },
  {
    stageId: "stage-6",
    noteKey: "careers.syllabus.s6.note",
    courses: [],
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

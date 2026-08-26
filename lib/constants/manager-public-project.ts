import {
  PROJECT_SECTION_IDS,
  type ProjectSectionId,
} from "@/lib/constants/public-projects";

export const PUBLIC_PROJECT_FIELD_LIMITS = {
  title: { min: 1, max: 120 },
  body: { min: 1, max: 500 },
  category: { min: 1, max: 80 },
  author: { max: 120 },
  image_url: { max: 2000 },
  href: { max: 2000 },
} as const;

/** Used when create/edit saves without an uploaded image, and as a load-error fallback. */
export const PUBLIC_PROJECT_PLACEHOLDER_IMAGE_URL =
  "/public_images/placeholder.jpg";


/** Short labels copy into the category input; descriptions are typeahead help only. */
export const PUBLIC_PROJECT_CATEGORY_SUGGESTIONS = [
  {
    label: "Web App",
    description:
      "Interactive applications with login, dashboards, CRUD, etc.",
  },
  {
    label: "Website",
    description:
      "Marketing, company, landing, portfolio, informational sites.",
  },
  {
    label: "Mobile App",
    description: "iOS / Android apps.",
  },
  {
    label: "Desktop App",
    description: "Windows, macOS, Linux applications.",
  },
  {
    label: "Backend / API",
    description: "REST APIs, microservices, backend systems.",
  },
  {
    label: "AI / Machine Learning",
    description: "AI-powered applications, ML systems, agents.",
  },
  {
    label: "Cybersecurity",
    description: "Scanners, security tools, vulnerability assessment.",
  },
  {
    label: "Automation / DevOps",
    description: "Automation systems, CI/CD, infrastructure tools.",
  },
  {
    label: "IoT / Embedded",
    description: "Arduino, ESP32, sensors, hardware-connected software.",
  },
  {
    label: "SaaS",
    description: "Cloud-based software products.",
  },
  {
    label: "CLI / Developer Tool",
    description: "Command-line tools, SDKs, developer utilities.",
  },
  { label: "PCB / Electronics", description: "" },
  { label: "Embedded Systems", description: "" },
  { label: "IoT", description: "" },
  { label: "Robotics", description: "" },
  { label: "Electronic Device", description: "" },
  { label: "Hardware Prototype", description: "" },
  { label: "3D Printing", description: "" },
  { label: "Mechanical Design", description: "" },
  { label: "CNC / Manufacturing", description: "" },
  { label: "Sensors & Instrumentation", description: "" },
  { label: "IoT System", description: "" },
  { label: "Smart Device", description: "" },
  { label: "Robotics System", description: "" },
  { label: "Embedded + Web", description: "" },
  { label: "Embedded + Mobile", description: "" },
  { label: "Hardware Automation", description: "" },
  { label: "Computer Vision Device", description: "" },
  { label: "AI + Hardware", description: "" },
  { label: "Industrial System", description: "" },
  { label: "3D Printed Product", description: "" },
  { label: "Electronic Product", description: "" },
  { label: "Mechanical Product", description: "" },
  { label: "Prototype", description: "" },
  { label: "Custom Device", description: "" },
] as const;

export type PublicProjectCategorySuggestion =
  (typeof PUBLIC_PROJECT_CATEGORY_SUGGESTIONS)[number];


export const PUBLIC_PROJECT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const PUBLIC_PROJECT_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type PublicProjectImageMimeType =
  (typeof PUBLIC_PROJECT_IMAGE_ALLOWED_MIME_TYPES)[number];

export const PUBLIC_PROJECT_IMAGE_ACCEPT =
  PUBLIC_PROJECT_IMAGE_ALLOWED_MIME_TYPES.join(",");

export const PUBLIC_PROJECT_CLASSIFICATION_VALUES = PROJECT_SECTION_IDS;

export type PublicProjectClassificationValue = ProjectSectionId;

export const PUBLIC_PROJECT_CLASSIFICATION_LABELS: Record<
  PublicProjectClassificationValue,
  string
> = {
  students: "Students",
  teachers: "Teachers",
  etkan: "Etkan",
};

export const STUDENTS_TABLE_PAGINATION = {
  pageSize: 50,
  maxPages: 100,
} as const;

export const COURSES_GRID_PAGINATION = {
  pageSize: 40,
  maxPages: 50,
} as const;

export const WEEKS_LIST_PAGINATION = {
  pageSize: 50,
  maxPages: 250,
} as const;

export const SYSTEMS_CATEGORIES_PAGINATION = {
  pageSize: 40,
  maxPages: 50,
} as const;

export const CRITERIA_TABLE_PAGINATION = {
  pageSize: 20,
  maxPages: 10,
} as const;

/** Max visible characters per table cell before appending "...". */
export const TABLE_CELL_CHAR_LIMITS = {
  username: 20,
  email: 28,
  fullName: 24,
  phone: 16,
  educationalLevel: 20,
  status: 12,
  date: 16,
  weekCourseName: 28,
  weekName: 32,
  weekCardTitle: 48,
  weekCardMeta: 40,
  categoryName: 36,
  categoryCourse: 32,
  criterionName: 28,
  criterionGradeType: 12,
  criterionNumeric: 10,
  default: 24,
} as const;

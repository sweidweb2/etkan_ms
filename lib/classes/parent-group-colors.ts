import {
  getRootCategories,
  getRootParentId,
  type CategoryTreeNode,
} from "@/lib/classes/category-tree";

export type ParentGroupTone = {
  chip: string;
  chipSelected: string;
  border: string;
};

const PARENT_TONES: readonly ParentGroupTone[] = [
  {
    chip: "border-sky-300/70 bg-sky-500/10 text-sky-900 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-100",
    chipSelected:
      "border-sky-500 bg-sky-500/20 text-sky-950 ring-2 ring-sky-500/40 dark:border-sky-300 dark:bg-sky-400/20 dark:text-sky-50",
    border: "border-sky-300/60 dark:border-sky-400/40",
  },
  {
    chip: "border-violet-300/70 bg-violet-500/10 text-violet-900 dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-100",
    chipSelected:
      "border-violet-500 bg-violet-500/20 text-violet-950 ring-2 ring-violet-500/40 dark:border-violet-300 dark:bg-violet-400/20 dark:text-violet-50",
    border: "border-violet-300/60 dark:border-violet-400/40",
  },
  {
    chip: "border-emerald-300/70 bg-emerald-500/10 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-100",
    chipSelected:
      "border-emerald-500 bg-emerald-500/20 text-emerald-950 ring-2 ring-emerald-500/40 dark:border-emerald-300 dark:bg-emerald-400/20 dark:text-emerald-50",
    border: "border-emerald-300/60 dark:border-emerald-400/40",
  },
  {
    chip: "border-amber-300/70 bg-amber-500/10 text-amber-950 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100",
    chipSelected:
      "border-amber-500 bg-amber-500/20 text-amber-950 ring-2 ring-amber-500/40 dark:border-amber-300 dark:bg-amber-400/20 dark:text-amber-50",
    border: "border-amber-300/60 dark:border-amber-400/40",
  },
  {
    chip: "border-rose-300/70 bg-rose-500/10 text-rose-900 dark:border-rose-400/40 dark:bg-rose-400/10 dark:text-rose-100",
    chipSelected:
      "border-rose-500 bg-rose-500/20 text-rose-950 ring-2 ring-rose-500/40 dark:border-rose-300 dark:bg-rose-400/20 dark:text-rose-50",
    border: "border-rose-300/60 dark:border-rose-400/40",
  },
  {
    chip: "border-cyan-300/70 bg-cyan-500/10 text-cyan-900 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-100",
    chipSelected:
      "border-cyan-500 bg-cyan-500/20 text-cyan-950 ring-2 ring-cyan-500/40 dark:border-cyan-300 dark:bg-cyan-400/20 dark:text-cyan-50",
    border: "border-cyan-300/60 dark:border-cyan-400/40",
  },
];

export type ParentGroupToneMaps = {
  /** categoryId → tone (inherits root parent tone) */
  byCategoryId: Map<string, ParentGroupTone>;
  /** root parent id → tone */
  byRootId: Map<string, ParentGroupTone>;
};

export function buildParentGroupToneMaps(
  categories: readonly CategoryTreeNode[]
): ParentGroupToneMaps {
  const roots = getRootCategories(categories);
  const byRootId = new Map<string, ParentGroupTone>();
  roots.forEach((root, index) => {
    byRootId.set(root.id, PARENT_TONES[index % PARENT_TONES.length]!);
  });

  const byCategoryId = new Map<string, ParentGroupTone>();
  for (const category of categories) {
    const rootId = getRootParentId(categories, category.id);
    const tone = byRootId.get(rootId) ?? PARENT_TONES[0]!;
    byCategoryId.set(category.id, tone);
  }

  return { byCategoryId, byRootId };
}

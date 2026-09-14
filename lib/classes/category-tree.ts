export type CategoryTreeNode = {
  id: string;
  parent_id: string | null;
  name: string;
};

export function getRootCategories<T extends CategoryTreeNode>(
  categories: readonly T[]
): T[] {
  return categories
    .filter((category) => category.parent_id === null)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getDirectChildren<T extends CategoryTreeNode>(
  categories: readonly T[],
  parentId: string
): T[] {
  return categories
    .filter((category) => category.parent_id === parentId)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getCategoryById<T extends CategoryTreeNode>(
  categories: readonly T[],
  id: string
): T | undefined {
  return categories.find((category) => category.id === id);
}

/** Walk up to the root parent id for tone inheritance. */
export function getRootParentId(
  categories: readonly CategoryTreeNode[],
  categoryId: string
): string {
  const byId = new Map(categories.map((row) => [row.id, row]));
  let current = byId.get(categoryId);
  const seen = new Set<string>();

  while (current?.parent_id) {
    if (seen.has(current.id)) {
      break;
    }
    seen.add(current.id);
    const parent = byId.get(current.parent_id);
    if (!parent) {
      break;
    }
    current = parent;
  }

  return current?.id ?? categoryId;
}

"use client";

import { useMemo, useState } from "react";
import { mergeItemsById } from "@/lib/utils/prepend-unique-by-id";

type KanbanItemBase = {
  id: string;
};

type KanbanGroupBase = {
  id: string;
  name: string;
  sort_order: number;
};

type UseManageKanbanPanelOptions<
  TItem extends KanbanItemBase,
  TGroup extends KanbanGroupBase,
> = {
  initialItems: TItem[];
  initialGroups: TGroup[];
  matchesSearch: (item: TItem, query: string) => boolean;
  compareGroups: (left: TGroup, right: TGroup) => number;
};

/**
 * Shared manage-panel state for semester/subject kanban shells:
 * prop sync, search filter, dialog flags, and merge-safe board updates.
 */
export function useManageKanbanPanel<
  TItem extends KanbanItemBase,
  TGroup extends KanbanGroupBase,
>({
  initialItems,
  initialGroups,
  matchesSearch,
  compareGroups,
}: UseManageKanbanPanelOptions<TItem, TGroup>) {
  const [items, setItems] = useState(initialItems);
  const [prevItems, setPrevItems] = useState(initialItems);
  const [groups, setGroups] = useState(() =>
    [...initialGroups].sort(compareGroups)
  );
  const [prevGroups, setPrevGroups] = useState(initialGroups);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  if (initialItems !== prevItems) {
    setPrevItems(initialItems);
    setItems(initialItems);
  }

  if (initialGroups !== prevGroups) {
    setPrevGroups(initialGroups);
    setGroups([...initialGroups].sort(compareGroups));
  }

  const filteredItems = useMemo(
    () => items.filter((item) => matchesSearch(item, searchQuery)),
    [items, matchesSearch, searchQuery]
  );

  const sortingEnabled = searchQuery.trim().length === 0;

  function handleItemsBoardChange(next: TItem[]) {
    setItems((current) => mergeItemsById(current, next));
  }

  function handleGroupCreated(group: TGroup) {
    setGroups((current) =>
      [...current.filter((row) => row.id !== group.id), group].sort(
        compareGroups
      )
    );
  }

  return {
    items,
    setItems,
    groups,
    setGroups,
    filteredItems,
    searchQuery,
    setSearchQuery,
    sortingEnabled,
    isAddOpen,
    setIsAddOpen,
    isCreateGroupOpen,
    setIsCreateGroupOpen,
    isAssignOpen,
    setIsAssignOpen,
    handleItemsBoardChange,
    handleGroupCreated,
  };
}

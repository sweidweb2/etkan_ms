import { create } from "zustand";
import type { MessageKey } from "@/lib/i18n/messages";

export type CareersCartKind = "workshop" | "online";

export type CareersCartItem = {
  key: string;
  kind: CareersCartKind;
  courseId: string;
  titleKey: MessageKey;
  imageSrc: string;
};

type CareersCartState = {
  items: CareersCartItem[];
  isOpen: boolean;
  addItem: (item: CareersCartItem) => void;
  removeItem: (key: string) => void;
  toggleItem: (item: CareersCartItem) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  setOpen: (open: boolean) => void;
};

export function makeCareersCartKey(
  kind: CareersCartKind,
  courseId: string
): string {
  return `${kind}:${courseId}`;
}

export const useCareersCartStore = create<CareersCartState>((set, get) => ({
  items: [],
  isOpen: false,
  addItem: (item) => {
    if (get().items.some((entry) => entry.key === item.key)) return;
    set((state) => ({ items: [...state.items, item] }));
  },
  removeItem: (key) => {
    set((state) => ({
      items: state.items.filter((entry) => entry.key !== key),
      isOpen:
        state.items.filter((entry) => entry.key !== key).length === 0
          ? false
          : state.isOpen,
    }));
  },
  toggleItem: (item) => {
    const exists = get().items.some((entry) => entry.key === item.key);
    if (exists) {
      get().removeItem(item.key);
      return;
    }
    get().addItem(item);
  },
  clear: () => set({ items: [], isOpen: false }),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  setOpen: (open) => set({ isOpen: open }),
}));

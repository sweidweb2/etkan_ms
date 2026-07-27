"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import {
  CheckIcon,
  MessageCircleIcon,
  PlusIcon,
  ShoppingBagIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { CONTACT } from "@/lib/constants/contact";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";
import {
  makeCareersCartKey,
  useCareersCartStore,
  type CareersCartItem,
  type CareersCartKind,
} from "@/stores/careers-cart-store";

type CareersAddToCartButtonProps = {
  kind: CareersCartKind;
  courseId: string;
  titleKey: CareersCartItem["titleKey"];
  imageSrc: string;
  className?: string;
};

const ADD_BTN_BASE =
  "absolute bottom-3 end-3 z-10 flex size-9 items-center justify-center rounded-full border shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3E3E75]/35";

const ADD_BTN_IDLE =
  "border-[#3E3E75] bg-[#3E3E75] text-white hover:bg-[#2F2F5A] hover:border-[#2F2F5A]";

const ADD_BTN_SELECTED =
  "border-[#2F2F5A] bg-[#2F2F5A] text-white ring-2 ring-[#3E3E75]/30 hover:bg-[#252545]";

export function CareersAddToCartButton({
  kind,
  courseId,
  titleKey,
  imageSrc,
  className,
}: CareersAddToCartButtonProps) {
  const { t } = usePublicI18n();
  const key = makeCareersCartKey(kind, courseId);
  const isSelected = useCareersCartStore((state) =>
    state.items.some((item) => item.key === key)
  );
  const toggleItem = useCareersCartStore((state) => state.toggleItem);

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={
        isSelected ? t("careers.cart.removeAria") : t("careers.cart.addAria")
      }
      suppressHydrationWarning
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleItem({ key, kind, courseId, titleKey, imageSrc });
      }}
      className={
        className
          ? `${ADD_BTN_BASE} ${isSelected ? ADD_BTN_SELECTED : ADD_BTN_IDLE} ${className}`
          : `${ADD_BTN_BASE} ${isSelected ? ADD_BTN_SELECTED : ADD_BTN_IDLE}`
      }
    >
      {isSelected ? (
        <CheckIcon className="size-4" aria-hidden="true" />
      ) : (
        <PlusIcon className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}

function buildWhatsAppHref(
  items: CareersCartItem[],
  t: ReturnType<typeof usePublicI18n>["t"]
) {
  const lines = [
    t("careers.cart.whatsappIntro"),
    "",
    ...items.map((item) => {
      const kindLabel =
        item.kind === "workshop"
          ? t("careers.cart.kind.workshop")
          : t("careers.cart.kind.online");
      return `- ${kindLabel}: ${t(item.titleKey)}`;
    }),
    "",
    t("careers.cart.whatsappOutro"),
  ];

  return `${CONTACT.whatsappUrl}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function CareersCartDock() {
  const { t } = usePublicI18n();
  const hydrated = useHydrated();
  const rootRef = useRef<HTMLDivElement>(null);
  const items = useCareersCartStore((state) => state.items);
  const isOpen = useCareersCartStore((state) => state.isOpen);
  const setOpen = useCareersCartStore((state) => state.setOpen);
  const removeItem = useCareersCartStore((state) => state.removeItem);
  const clear = useCareersCartStore((state) => state.clear);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target || !rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setOpen]);

  if (!hydrated || items.length === 0) return null;

  const whatsappHref = buildWhatsAppHref(items, t);

  return (
    <div ref={rootRef} className="fixed bottom-5 end-5 z-40 flex flex-col items-end gap-3">
      {isOpen ? (
        <div
          role="dialog"
          aria-label={t("careers.cart.title")}
          className={cn(
            "flex w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border",
            "border-[#3E3E75]/15 bg-background shadow-[0_24px_60px_-28px_rgba(0,0,0,0.55)]",
            "dark:border-[#C4C4E8]/20 dark:bg-[#2A2A52] dark:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)]",
            "origin-bottom-right animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3 dark:border-[#C4C4E8]/15">
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">
                {t("careers.cart.title")}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {t("careers.cart.description")}
              </p>
            </div>
            <button
              type="button"
              aria-label={t("careers.cart.closeAria")}
              onClick={() => setOpen(false)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-[#C4C4E8]/10"
            >
              <XIcon className="size-4" aria-hidden="true" />
            </button>
          </div>

          <ul className="max-h-64 space-y-2 overflow-y-auto px-3 py-3">
            {items.map((item) => (
              <li
                key={item.key}
                className="flex gap-2.5 rounded-xl bg-muted/60 p-2 dark:bg-[#1A1A2E]/70"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={item.imageSrc}
                    alt={t(item.titleKey)}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
                    {item.kind === "workshop"
                      ? t("careers.cart.kind.workshop")
                      : t("careers.cart.kind.online")}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold">
                    {t(item.titleKey)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t("careers.cart.removeAria")}
                  onClick={() => removeItem(item.key)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground dark:hover:bg-[#C4C4E8]/10"
                >
                  <XIcon className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 border-t border-border/70 px-3 py-3 dark:border-[#C4C4E8]/15">
            <Button
              type="button"
              variant="outline"
              onClick={clear}
              className="w-full dark:border-[#C4C4E8]/25 dark:bg-transparent dark:hover:bg-[#C4C4E8]/10"
            >
              {t("careers.cart.clear")}
            </Button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium",
                "bg-[#25D366] text-white transition-colors hover:bg-[#1ebe57]",
                "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#25D366]/40"
              )}
            >
              <MessageCircleIcon className="size-4" aria-hidden="true" />
              {t("careers.cart.whatsappCta")}
            </a>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={t("careers.cart.openAria")}
        onClick={() => setOpen(!isOpen)}
        className={cn(
          "relative flex size-14 items-center justify-center rounded-full",
          "bg-[#3E3E75] text-white shadow-[0_16px_40px_-16px_rgba(62,62,117,0.85)]",
          "transition-transform duration-200 hover:scale-105 hover:bg-[#2F2F5A]",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3E3E75]/40",
          "dark:bg-[#C4C4E8] dark:text-[#1A1A2E] dark:hover:bg-white dark:focus-visible:ring-[#C4C4E8]/45"
        )}
      >
        <ShoppingBagIcon className="size-5" aria-hidden="true" />
        <span className="absolute -top-1 -end-1 flex size-5 items-center justify-center rounded-full bg-white text-[0.7rem] font-bold text-[#3E3E75] ring-2 ring-[#3E3E75] dark:bg-[#1A1A2E] dark:text-[#C4C4E8] dark:ring-[#C4C4E8]">
          {items.length}
        </span>
      </button>
    </div>
  );
}

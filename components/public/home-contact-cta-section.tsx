"use client";

import { useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { MessageCircleIcon, PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHydrated } from "@/hooks/use-hydrated";
import { CONTACT } from "@/lib/constants/contact";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { showSuccessToast } from "@/lib/toast";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, amount: 0.35, margin: "0px 0px -8% 0px" } as const;

/** Stable single-line classes — avoid buttonVariants/cn on SSR CTAs (hydration). */
const WHATSAPP_LINK_CLASS =
  "group/button inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#3E3E75]/30 bg-white px-2.5 text-sm font-medium whitespace-nowrap text-[#3E3E75] transition-all outline-none select-none hover:bg-[#3E3E75]/8 hover:text-[#2F2F5A] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

function isValidPhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  const digitCount = digits.replace(/\D/g, "").length;
  return digitCount >= 8 && digitCount <= 15 && /^[\d+\s()-]+$/.test(value.trim());
}

export function HomeContactCtaSection() {
  const { t } = usePublicI18n();
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const canAnimate = hydrated && !reduceMotion;

  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = phone.trim();

    if (!isValidPhone(trimmed)) {
      setPhoneError(t("contactCta.phoneError"));
      return;
    }

    setPhoneError(null);
    // UI-only for now — no backend persistence yet.
    showSuccessToast(t("contactCta.success"));
    setPhone("");
    setOpen(false);
  };

  return (
    <section className="relative isolate overflow-hidden bg-[#3E3E75] px-4 py-10 text-white sm:px-6 sm:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(154,154,208,0.22),transparent_55%),linear-gradient(180deg,#343463,#3E3E75_45%,#2F2F5A)]"
      />

      <motion.div
        className="relative z-10 mx-auto max-w-4xl overflow-hidden rounded-xl border border-white/20 bg-white px-5 py-5 text-foreground shadow-[0_16px_40px_-20px_rgba(0,0,0,0.4)] sm:px-7 sm:py-6"
        initial={canAnimate ? { opacity: 0, y: 28 } : false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VIEWPORT}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="min-w-0 flex-1 text-start">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#3E3E75] uppercase">
              {t("contactCta.eyebrow")}
            </p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-balance text-slate-900 sm:text-2xl">
              {t("contactCta.title")}
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600 text-pretty">
              {t("contactCta.body")}
            </p>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button
              type="button"
              size="lg"
              onClick={() => setOpen(true)}
              className="bg-[#3E3E75] text-white hover:bg-[#2F2F5A]"
            >
              <PhoneIcon className="size-4" />
              {t("contactCta.open")}
            </Button>
            <a
              href={CONTACT.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("contactCta.whatsappAria")}
              suppressHydrationWarning
              className={WHATSAPP_LINK_CLASS}
            >
              <MessageCircleIcon className="size-4" />
              <span suppressHydrationWarning>{t("contactCta.whatsapp")}</span>
            </a>
          </div>
        </div>
      </motion.div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setPhoneError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("contactCta.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("contactCta.dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="contact-cta-phone">
                {t("contactCta.phoneLabel")}
              </Label>
              <Input
                id="contact-cta-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={t("contactCta.phonePlaceholder")}
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  if (phoneError) setPhoneError(null);
                }}
                aria-invalid={!!phoneError}
                aria-describedby={
                  phoneError ? "contact-cta-phone-error" : undefined
                }
              />
              {phoneError ? (
                <p
                  id="contact-cta-phone-error"
                  className="text-sm text-destructive"
                >
                  {phoneError}
                </p>
              ) : null}
            </div>

            <DialogFooter className="gap-2 sm:flex-col">
              <Button
                type="submit"
                className="w-full bg-[#3E3E75] text-white hover:bg-[#2F2F5A] sm:w-full"
              >
                {t("contactCta.submit")}
              </Button>
              <div className="flex w-full items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground uppercase">
                  {t("contactCta.or")}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <a
                href={CONTACT.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("contactCta.whatsappAria")}
                suppressHydrationWarning
                className={`${WHATSAPP_LINK_CLASS} w-full`}
              >
                <MessageCircleIcon className="size-4" />
                <span suppressHydrationWarning>{t("contactCta.whatsapp")}</span>
                <span className="text-muted-foreground">
                  {CONTACT.whatsappDisplay}
                </span>
              </a>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

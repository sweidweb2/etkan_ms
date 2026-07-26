import type { Locale } from "@/lib/i18n/locales";
import { ar } from "@/lib/i18n/messages/ar";
import { en, type MessageKey } from "@/lib/i18n/messages/en";

export type { MessageKey };

const messagesByLocale = {
  en,
  ar,
} as const;

export type Messages = Record<MessageKey, string>;

export function getMessages(locale: Locale): Messages {
  return messagesByLocale[locale];
}

export function translate(
  locale: Locale,
  key: MessageKey
): string {
  return messagesByLocale[locale][key];
}

"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  TOAST_MESSAGES,
  TOAST_QUERY_KEYS,
} from "@/lib/constants/toast-messages";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/lib/toast";

export function SearchParamsToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const shownRef = useRef<string | null>(null);

  useEffect(() => {
    const successKey = searchParams.get(TOAST_QUERY_KEYS.success);
    const errorKey = searchParams.get(TOAST_QUERY_KEYS.error);
    const infoKey = searchParams.get(TOAST_QUERY_KEYS.info);

    const fingerprint = JSON.stringify({ successKey, errorKey, infoKey });

    if (!successKey && !errorKey && !infoKey) {
      return;
    }

    if (shownRef.current === fingerprint) {
      return;
    }

    shownRef.current = fingerprint;

    if (successKey) {
      const message =
        TOAST_MESSAGES.success[
          successKey as keyof typeof TOAST_MESSAGES.success
        ];

      if (message) {
        showSuccessToast(message);
      }
    } else if (errorKey) {
      const message =
        TOAST_MESSAGES.error[errorKey as keyof typeof TOAST_MESSAGES.error] ??
        TOAST_MESSAGES.error.auth_failed;

      showErrorToast(message);
    } else if (infoKey) {
      const message =
        TOAST_MESSAGES.info[infoKey as keyof typeof TOAST_MESSAGES.info];

      if (message) {
        showInfoToast(message);
      }
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete(TOAST_QUERY_KEYS.success);
    params.delete(TOAST_QUERY_KEYS.error);
    params.delete(TOAST_QUERY_KEYS.info);
    const queryString = params.toString();

    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  return null;
}

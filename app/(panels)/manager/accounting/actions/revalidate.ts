import { revalidatePath } from "next/cache";
import {
  getManagerAccountingPhaseDetailRoute,
  getManagerAccountingSppDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";

export function revalidateAccountingList() {
  revalidatePath(ROUTES.MANAGER_ACCOUNTING);
}

export function revalidateAccountingPhaseDetail(phaseId: string) {
  revalidatePath(getManagerAccountingPhaseDetailRoute(phaseId));
}

export function revalidateAccountingSppDetail(phaseId: string, sppId: string) {
  revalidateAccountingPhaseDetail(phaseId);
  revalidatePath(getManagerAccountingSppDetailRoute(phaseId, sppId));
}

export function revalidateAccountingPhaseListAndDetail(phaseId: string) {
  revalidateAccountingList();
  revalidateAccountingPhaseDetail(phaseId);
}

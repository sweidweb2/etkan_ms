"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { repairMissingSppAction } from "@/app/manager/accounting/actions";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import type {
  ManagerMissingSppRow,
  RepairMissingSppActionState,
} from "@/types/manager-payment-phase";

const initialState: RepairMissingSppActionState = {};

type RepairMissingSppButtonProps = {
  row: ManagerMissingSppRow;
};

export function RepairMissingSppButton({ row }: RepairMissingSppButtonProps) {
  const router = useRouter();
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    repairMissingSppAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);
  useActionStateSuccess(state, isPending, () => {
    router.refresh();
  });

  function handleAssign() {
    const formData = new FormData();
    formData.set("payment_phase_id", row.payment_phase_id);
    formData.set("student_id", row.student_id);

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={handleAssign}
    >
      {isPending ? <InlineSpinner /> : null}
      Assign
    </Button>
  );
}

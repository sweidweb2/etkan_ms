/**
 * Blocks closing a Dialog/Sheet while a mutation is pending.
 * Opening is always allowed; closing is ignored when `isPending` is true.
 */
export function usePendingAwareOpenChange(
  isPending: boolean,
  onOpenChange: (open: boolean) => void
) {
  return (nextOpen: boolean) => {
    if (!nextOpen && isPending) {
      return;
    }

    onOpenChange(nextOpen);
  };
}

const PRINT_BODY_CLASS = "etkan-print-section";

type PrintPageSectionOptions = {
  onStart?: () => void;
  onEnd?: () => void;
};

export function printPageSection(options: PrintPageSectionOptions = {}) {
  const { onStart, onEnd } = options;

  const cleanup = () => {
    document.body.classList.remove(PRINT_BODY_CLASS);
    onEnd?.();
  };

  document.body.classList.add(PRINT_BODY_CLASS);
  onStart?.();

  window.addEventListener("afterprint", cleanup, { once: true });
  window.requestAnimationFrame(() => {
    window.print();
  });
}

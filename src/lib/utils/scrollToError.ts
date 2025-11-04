/**
 * Scroll to the first invalid field inside a container.
 * Looks for aria-invalid, input error rings, and elements annotated with data-field.
 */
export function scrollToFirstInvalid(container?: HTMLElement | null) {
  const root = container ?? document.body;
  const selector = [
    "[aria-invalid='true']",
    ".ring-red-300",
    "[data-field].error",
  ].join(",");

  const el = root.querySelector<HTMLElement>(selector);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus?.();
  }
}



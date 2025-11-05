/**
 * Scroll to the first invalid field inside a container.
 * Looks for aria-invalid, error rings/borders, and elements annotated with data-field.
 */
export function scrollToFirstInvalid(container?: HTMLElement | null) {
  const root = container ?? document.body;
  const selector = [
    "[aria-invalid='true']",
    ".ring-red-300",
    ".ring-red-400",
    ".border-red-300",
    ".border-red-400",
    "[data-field].error",
  ].join(",");

  let el = root.querySelector<HTMLElement>(selector);

  // Fallback: pick a data-field whose ancestor has a red ring/border
  if (!el) {
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-field]"));
    el =
      nodes.find((n) => {
        let p: HTMLElement | null = n;
        while (p) {
          const cls = p.className?.toString?.() ?? "";
          if (/ring-red-|border-red-/.test(cls)) return true;
          p = p.parentElement;
        }
        return false;
      }) || null;
  }

  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus?.();
  }
}



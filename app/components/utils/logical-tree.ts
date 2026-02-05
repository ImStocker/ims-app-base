export function assignLogicalParent(el: Element, parent: Element | null): void {
  (el as any).imsLogicalParent = parent;
}

export function logicalTreeContains(container: Element, element: Element) {
  let element_parent: Element | null = element;
  while (element_parent && container !== element_parent) {
    if ((element_parent as any).imsLogicalParent) {
      element_parent = (element_parent as any).imsLogicalParent;
    } else {
      element_parent = element_parent.parentElement;
    }
  }
  return container === element_parent;
}

export function addLogicalParentFocusOutListener(
  element: HTMLElement,
  handler: (ev: FocusEvent) => void,
): { remove: () => void } {
  let last_clicked_inside = false;
  const track_last_clicked_handler = (ev: MouseEvent) => {
    const target = ev.target as HTMLElement;
    last_clicked_inside = logicalTreeContains(element, target);
    if (last_clicked_inside) {
      setTimeout(() => (last_clicked_inside = false), 1);
    }
  };
  const focus_out_handler = (ev: FocusEvent) => {
    if (!ev.relatedTarget) {
      if (!last_clicked_inside) {
        handler(ev);
      }
      return;
    }
    const rel_target = ev.relatedTarget as HTMLElement;

    if (element.contains(rel_target)) {
      // Note: check for focus was returned to original element after visiting rel_target_parent
      return;
    }

    const logical_contains = logicalTreeContains(element, rel_target);
    if (!logical_contains) {
      handler(ev);
      return;
    }

    // Note: add focus out to element where we switched the focus, because it doesn't  belong same subtree as element
    rel_target.addEventListener('focusout', focus_out_handler, {
      once: true,
    });
  };
  element.addEventListener('focusout', focus_out_handler);
  window.document.addEventListener(
    'mousedown',
    track_last_clicked_handler,
    true,
  );
  return {
    remove() {
      element.removeEventListener('focusout', focus_out_handler);
      window.document.removeEventListener(
        'mousedown',
        track_last_clicked_handler,
        true,
      );
    },
  };
}

export function addLogicalParentFocusInListener(
  element: HTMLElement,
  handler: (ev: FocusEvent) => void,
): { remove: () => void } {
  const focus_in_handler = (ev: FocusEvent) => {
    const target_element = ev.target as HTMLElement;
    if (!target_element) return;

    if (logicalTreeContains(element, target_element)) {
      handler(ev);
      return;
    }
  };
  window.document.addEventListener('focusin', focus_in_handler);
  return {
    remove() {
      window.document.removeEventListener('focusin', focus_in_handler);
    },
  };
}

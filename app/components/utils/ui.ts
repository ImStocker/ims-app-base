export function getIconClass(icon_class: string, icon_class_prefix?: string) {
  const splitted_icon_name = icon_class.split('-');

  return splitted_icon_name.length > 1
    ? icon_class
    : (icon_class_prefix ?? '') + icon_class;
}

export type SetClickOutsideCancel = () => void;

type ClickOutsideElements =
  | HTMLElement
  | HTMLElement[]
  | (() => HTMLElement | HTMLElement[]);

function resolveElements(elements: ClickOutsideElements): HTMLElement[] {
  const check_elements_or_element =
    typeof elements === 'function' ? elements() : elements;

  return !Array.isArray(check_elements_or_element)
    ? [check_elements_or_element]
    : check_elements_or_element;
}

function isNodeInside(
  start: EventTarget | null,
  check_elements: HTMLElement[],
  insideSelector?: string,
): boolean {
  let elem: any = start;

  while (elem && elem !== window.document) {
    if (check_elements.includes(elem)) {
      return true;
    }
    if (insideSelector && elem.matches && elem.matches(insideSelector)) {
      return true;
    }
    if (elem.imsLogicalParent) {
      elem = elem.imsLogicalParent;
    } else {
      elem = elem.parentNode;
    }
  }
  // Не реагировать на клик элементов, которые отсоединены от DOM
  return !elem;
}

export function setClickOutside(
  elements: ClickOutsideElements,
  callback: (e: MouseEvent) => any,
  options?: { insideSelector?: string },
): SetClickOutsideCancel {
  // Drag started inside must not count as a click outside.
  let mousedown_inside = false;

  const window_mousedown_handler = (event: MouseEvent) => {
    mousedown_inside = isNodeInside(
      event.target,
      resolveElements(elements),
      options?.insideSelector,
    );
  };

  const window_click_handler = (event: MouseEvent) => {
    const inside =
      isNodeInside(
        event.target,
        resolveElements(elements),
        options?.insideSelector,
      ) || mousedown_inside;
    mousedown_inside = false;

    if (!inside) callback(event);
  };

  window.addEventListener('mousedown', window_mousedown_handler, true);
  window.addEventListener('click', window_click_handler, true);
  return () => {
    window.removeEventListener('mousedown', window_mousedown_handler, true);
    window.removeEventListener('click', window_click_handler, true);
  };
}

export function setImsClickOutside(
  elements: HTMLElement | HTMLElement[] | (() => HTMLElement | HTMLElement[]),
  callback: (e: MouseEvent) => any,
  options?: { insideSelector?: string },
): SetClickOutsideCancel {
  return setClickOutside(elements, callback, {
    insideSelector:
      (options?.insideSelector ? `${options.insideSelector},` : '') +
      '.AssetEditorToolbar',
  });
}

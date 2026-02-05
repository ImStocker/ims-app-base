export function getIconClass(icon_class: string, icon_class_prefix?: string) {
  const splitted_icon_name = icon_class.split('-');

  return splitted_icon_name.length > 1
    ? icon_class
    : (icon_class_prefix ?? '') + icon_class;
}

export type SetClickOutsideCancel = () => void;

export function setClickOutside(
  elements: HTMLElement | HTMLElement[] | (() => HTMLElement | HTMLElement[]),
  callback: (e: MouseEvent) => any,
  options?: { insideSelector?: string },
): SetClickOutsideCancel {
  const window_click_handler = (event) => {
    let elem = event.target;
    let inside = false;
    const check_elements_or_element =
      typeof elements === 'function' ? elements() : elements;
    const check_elements = !Array.isArray(check_elements_or_element)
      ? [check_elements_or_element]
      : check_elements_or_element;

    while (elem && elem !== window.document) {
      if (check_elements.includes(elem)) {
        inside = true;
        break;
      }
      if (
        options?.insideSelector &&
        elem.matches &&
        elem.matches(options.insideSelector)
      ) {
        inside = true;
        break;
      }
      if (elem.imsLogicalParent) {
        elem = elem.imsLogicalParent;
      } else {
        elem = elem.parentNode;
      }
    }
    if (!elem) inside = true; // Не реагировать на клик элементов, которые отсоединены от DOM

    if (!inside) callback(event);
  };
  window.addEventListener('click', window_click_handler, true);
  return () => {
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

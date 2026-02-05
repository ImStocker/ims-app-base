export function getScrollParentNode(node: Node): Element | Window | null {
  if (typeof window === 'undefined') return null;
  while (node) {
    if (node === document.body) return window;

    const overflow_y = (window.getComputedStyle(node as Element) as any)[
      'overflow-y'
    ];
    const has_scroll =
      overflow_y === 'auto' ||
      overflow_y === 'scroll' ||
      overflow_y === 'hidden';

    if (has_scroll) {
      return node as Element;
    } else {
      node = node.parentNode as Node;
    }
  }
  return null;
}

export function getScrollEdgeState(element: Element | Window): {
  yBegin: boolean;
  yEnd: boolean;
  xBegin: boolean;
  xEnd: boolean;
} {
  if (element instanceof Window) {
    return {
      yBegin: element.scrollY < 1,
      xBegin: element.scrollX < 1,
      yEnd:
        element.scrollY + element.innerHeight >
        element.document.body.clientHeight - 1,
      xEnd:
        element.scrollX + element.innerWidth >
        element.document.body.clientWidth - 1,
    };
  } else {
    return {
      yBegin: element.scrollTop < 1,
      xBegin: element.scrollLeft < 1,
      yEnd: element.scrollTop + element.clientHeight > element.scrollHeight - 1,
      xEnd: element.scrollLeft + element.clientWidth > element.scrollWidth - 1,
    };
  }
}

export function nodeHasClass(node: Node, class_name: string) {
  if (!node) return false;

  const element = node as Element;
  if (element.classList !== undefined) {
    if (element.classList.contains(class_name)) return true;
  } else if (element.className === undefined) return false;
  else if (element.className === class_name) return true;
  else {
    // check all classes
    const classes = element.className.split(/\s/);
    if (classes.some((c) => c.trim() === class_name)) {
      return true;
    }
  }
  return false;
}

export function nodeAddClass(node: Node, class_name: string) {
  if (!node || !class_name) return;

  const element = node as Element;
  if (typeof element.className === 'undefined') {
    return;
  }
  if (element.classList !== undefined) {
    element.classList.add(class_name);
  } else if (!nodeHasClass(node, class_name)) {
    const classes = element.className.split(/\s/);
    classes.push(class_name);
    element.className = classes.join(' ');
  }
}

export function nodeAddClassNamesString(
  node: Node,
  class_names_string: string,
) {
  if (!node || !class_names_string) return;
  const class_names = class_names_string.split(' ');
  for (const class_name of class_names) nodeAddClass(node, class_name);
}

export function nodeRemoveClass(node: Node, class_name: string) {
  if (!node) return;

  const element = node as Element;
  if (typeof element.className === 'undefined') {
    return;
  }
  if (element.classList !== undefined) {
    element.classList.remove(class_name);
  } else if (nodeHasClass(node, class_name)) {
    const classes = element.className.split(/\s/);
    const ind = classes.indexOf(class_name);
    if (ind >= 0) classes.splice(ind, 1);
    element.className = classes.join(' ');
  }
}

export function getClosestNodeBySelector(
  node: Node,
  selector: string,
  inside?: Node,
) {
  if (typeof window === 'undefined') return null;
  while (node) {
    if (node === document) return null;
    if (inside && node === inside) return null;

    if ((node as HTMLElement).matches(selector)) return node;

    node = node.parentNode as Node;
  }
  return null;
}

export function getClosestNodeByClass(
  node: Node,
  class_name: string,
  inside?: Node,
) {
  return getClosestNodeBySelector(node, '.' + class_name, inside);
}

export function nodeContainsElement(container: Node, node: Node | null) {
  if (typeof window === 'undefined') return false;
  if (!node) return false;
  if (container && typeof container.contains === 'function')
    return container.contains(node);
  while (node) {
    if (node === document) return container === document;

    if (node === container) return true;

    node = node.parentNode as Node;
  }
  return false;
}

export function removeNodeFromDOM(node: Element) {
  if (node.remove !== undefined) node.remove();
  else if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

export function getScrollTopOfNode(node: Element | Window) {
  return node === window ? node.scrollY : (node as Element).scrollTop;
}

export function getScrollLeftOfNode(node: Element | Window) {
  return node === window ? node.scrollX : (node as Element).scrollLeft;
}

export function getVisibleBoundingClientRect(node: Element): {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  x: number;
  y: number;
} {
  if (!node || !node.getBoundingClientRect) {
    return {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
    };
  }
  const node_bounds = node.getBoundingClientRect();
  const bounds: any = {
    left: node_bounds.left,
    top: node_bounds.top,
    right: node_bounds.right,
    bottom: node_bounds.bottom,
  };
  while (node) {
    if (node === document.body) break;

    if (node.getBoundingClientRect) {
      const overflow_y = (window.getComputedStyle(node) as any)['overflow-y'];
      const has_scroll =
        overflow_y === 'auto' ||
        overflow_y === 'scroll' ||
        overflow_y === 'hidden';

      if (has_scroll) {
        const scroll_bounds = node.getBoundingClientRect();
        bounds.left = Math.max(bounds.left, scroll_bounds.left);
        bounds.top = Math.max(bounds.top, scroll_bounds.top);
        bounds.right = Math.min(bounds.right, scroll_bounds.right);
        bounds.bottom = Math.min(bounds.bottom, scroll_bounds.bottom);
      }
    }
    node = node.parentNode as Element;
  }
  bounds.width = bounds.right - bounds.left;
  bounds.height = bounds.bottom - bounds.top;
  bounds.x = bounds.left;
  bounds.y = bounds.top;
  return bounds;
}

export function getRangeUnderMouse(
  clientX: number,
  clientY: number,
): {
  range: CaretPosition | Range | null;
  node: Node | null;
  offset: number;
} {
  let range: CaretPosition | Range | null = null;
  let node: Node | null = null;
  let offset = 0;

  if ((document as any).caretPositionFromPoint) {
    range = (document as any).caretPositionFromPoint(clientX, clientY);
    if (range) {
      node = (range as CaretPosition).offsetNode;
      offset = (range as CaretPosition).offset;
    }
  } else if ((document as any).caretRangeFromPoint) {
    // Use WebKit-proprietary fallback method
    range = (document as any).caretRangeFromPoint(clientX, clientY);
    if (range) {
      node = (range as Range).startContainer;
      offset = (range as Range).startOffset;
    }
  }

  return {
    range,
    node,
    offset,
  };
}

export function isElementInteractive(
  element: HTMLElement,
  interactiveClass = 'is-interactive',
) {
  if (!element) return false;
  if (
    element.tagName === 'A' ||
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'BUTTON'
  ) {
    return true;
  }
  const closest = getClosestNodeByClass(element, interactiveClass);
  if (closest) return true;
  return false;
}

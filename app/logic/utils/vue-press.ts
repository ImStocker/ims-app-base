export const calloutSelector = 'p.ql-callout[data-type]';

export function getVuePressContainerType(type: string) {
  switch (type) {
    case 'info':
      return 'tip';

    case 'warning':
      return 'warning';

    case 'error':
      return 'danger';

    case 'solution':
      return 'tip';

    default:
      return 'tip';
  }
}

export function isSameCalloutElement(element: Element | null, type: string) {
  if (!(element instanceof HTMLElement)) return false;

  return element.matches(calloutSelector) && element.dataset.type === type;
}

export function replacementForVuePressGroupedCallout() {
  return {
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return false;

      return node.matches(calloutSelector);
    },

    replacement: (content, node) => {
      const element = node as HTMLElement;

      const dataType = element.dataset.type || 'info';
      const containerType = getVuePressContainerType(dataType);

      const prevSame = isSameCalloutElement(
        element.previousElementSibling,
        dataType,
      );

      const nextSame = isSameCalloutElement(
        element.nextElementSibling,
        dataType,
      );

      const text = content.trim();

      let result = '';

      if (!prevSame) {
        result += `\n\n::: ${containerType}\n`;
      }

      result += text;

      if (nextSame) {
        result += `\n\n`;
      } else {
        result += `\n:::\n\n`;
      }

      return result;
    },
  };
}

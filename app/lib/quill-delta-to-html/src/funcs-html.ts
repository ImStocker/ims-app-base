import validator from 'validator';

export interface ITagKeyValue {
  key: string;
  value?: string;
}

export enum EncodeTarget {
  Html = 0,
  Url = 1,
}

export function makeStartTag(
  tag: any,
  attrs: ITagKeyValue | ITagKeyValue[] | undefined = undefined,
) {
  if (!tag) {
    return '';
  }

  let attrsStr = '';
  if (attrs) {
    const arrAttrs = ([] as ITagKeyValue[]).concat(attrs);
    attrsStr = arrAttrs
      .map(function (attr: any) {
        return (
          attr.key +
          (attr.value ? '="' + encodeHtml(attr.value.toString()) + '"' : '')
        );
      })
      .join(' ');
  }

  let closing = '>';
  if (tag === 'img' || tag === 'br') {
    closing = '/>';
  }
  return attrsStr ? `<${tag} ${attrsStr}${closing}` : `<${tag}${closing}`;
}

export function makeEndTag(tag: any = '') {
  return (tag && `</${tag}>`) || '';
}

export function decodeHtml(str: string) {
  return validator.unescape(str);
}

export function encodeHtml(str: string) {
  return validator.escape(str);
}

export function encodeLink(str: string) {
  const linkMaps = encodeMappings(EncodeTarget.Url);
  const decoded = linkMaps.reduce(decodeMapping, str);
  return linkMaps.reduce(encodeMapping, decoded);
}

export function encodeMappings(mtype: EncodeTarget) {
  const maps = [
    ['&', '&amp;'],
    ['<', '&lt;'],
    ['>', '&gt;'],
    ['"', '&quot;'],
    ["'", '&#x27;'],
    ['\\/', '&#x2F;'],
    ['\\(', '&#40;'],
    ['\\)', '&#41;'],
  ];
  if (mtype === EncodeTarget.Html) {
    return maps.filter(
      ([v, _]) => v.indexOf('(') === -1 && v.indexOf(')') === -1,
    );
  } else {
    // for url
    return maps.filter(([v, _]) => v.indexOf('/') === -1);
  }
}
export function encodeMapping(str: string, mapping: string[]) {
  return str.replace(new RegExp(mapping[0], 'g'), mapping[1]);
}
export function decodeMapping(str: string, mapping: string[]) {
  return str.replace(new RegExp(mapping[1], 'g'), mapping[0].replace('\\', ''));
}

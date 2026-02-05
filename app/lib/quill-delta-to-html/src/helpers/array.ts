export interface IArraySlice {
  sliceStartsAt: number;
  elements: any[];
}

export function preferSecond(arr: any[]): any {
  if (arr.length === 0) {
    return null;
  }
  return arr.length >= 2 ? arr[1] : arr[0];
}

export function flatten(arr: any[]): any[] {
  return arr.reduce((pv: any[], v: any) => {
    return pv.concat(Array.isArray(v) ? flatten(v) : v);
  }, []);
}

export function find(arr: any[], predicate: (currElm: any) => boolean) {
  if (Array.prototype.find) {
    return Array.prototype.find.call(arr, predicate);
  }

  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i])) return arr[i];
  }

  return undefined;
}

/**
 * Returns a new array by putting consecutive elements satisfying predicate into a new
 * array and returning others as they are.
 * Ex: [1, "ha", 3, "ha", "ha"] => [1, "ha", 3, ["ha", "ha"]]
 *      where predicate: (v, vprev) => typeof v === typeof vPrev
 */
export function groupConsecutiveElementsWhile(
  arr: any[],
  predicate: (currElm: any, prevElm: any) => boolean,
): any[] {
  const groups = [];

  let currElm, currGroup;
  for (let i = 0; i < arr.length; i++) {
    currElm = arr[i];

    if (i > 0 && predicate(currElm, arr[i - 1])) {
      currGroup = groups[groups.length - 1];
      currGroup.push(currElm);
    } else {
      groups.push([currElm]);
    }
  }
  return groups.map((g) => (g.length === 1 ? g[0] : g));
}

/**
 * Returns consecutive list of elements satisfying the predicate starting from startIndex
 * and traversing the array in reverse order.
 */
export function sliceFromReverseWhile(
  arr: any[],
  startIndex: number,
  predicate: (currElm: any) => boolean,
): IArraySlice {
  const result = {
    elements: [] as any[],
    sliceStartsAt: -1,
  };
  for (let i = startIndex; i >= 0; i--) {
    if (!predicate(arr[i])) {
      break;
    }
    result.sliceStartsAt = i;
    result.elements.unshift(arr[i]);
  }
  return result;
}

export function intersperse(arr: any[], item: any): any[] {
  return arr.reduce((pv: any[], v: any, index: number) => {
    pv.push(v);
    if (index < arr.length - 1) {
      pv.push(item);
    }
    return pv;
  }, []);
}

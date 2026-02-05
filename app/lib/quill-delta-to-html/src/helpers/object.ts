// Copied from mdn's Object.assign
export function assign(
  target: any,
  ...sources: any[] /*, one or more source objects */
) {
  // TypeError if undefined or null
  if (target == null) {
    throw new TypeError('Cannot convert undefined or null to object');
  }

  const to = Object(target);

  for (let index = 0; index < sources.length; index++) {
    const nextSource = sources[index];

    if (nextSource != null) {
      // Skip over if undefined or null
      for (const nextKey in nextSource) {
        // Avoid bugs when hasOwnProperty is shadowed
        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
          to[nextKey] = nextSource[nextKey];
        }
      }
    }
  }
  return to;
}

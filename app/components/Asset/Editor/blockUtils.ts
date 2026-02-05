export function getPreviousIndexWithTimestamp(current_index: number): number {
  const timestamp = parseFloat('0.' + Date.now());
  return current_index + timestamp - 1;
}

export function getNextIndexWithTimestamp(current_index: number): number {
  const timestamp = parseFloat('0.' + Date.now());
  return current_index + timestamp + 1;
}

export function getBetweenIndexWithTimestamp(
  index1: number,
  index2: number,
): number {
  const timestamp = parseFloat('0.' + Date.now());
  return (index1 * (1 - timestamp) + index2 * (1 + timestamp)) / 2;
}

export function getIndexRangeStartAndStep(
  from: number | undefined,
  to: number | undefined,
  count: number,
): {
  start: number;
  step: number;
} {
  let start: number | undefined;
  if (from !== undefined) {
    start = from;
  } else {
    start = to !== undefined ? to - count : 1;
  }
  if (to === undefined) {
    to = start + count;
  }
  const step = count > 0 ? (to - start) / count : 0;

  return {
    start,
    step,
  };
}

type ObjectWithIdT<
  PropertyName extends string,
  KeyType extends string | number,
> = { [P in PropertyName]: KeyType };

export function intersectObjectArrays<
  T extends ObjectWithIdT<Key, KeyType>,
  Key extends string = 'id',
  KeyType extends string | number = string,
>(arr1: T[], arr2: T[], key: Key = 'id' as Key): T[] {
  const arr2_keys = new Set(arr2.map((a) => a[key]));
  return arr1.filter((a) => arr2_keys.has(a[key]));
}

export function unionObjectArrays<
  T extends ObjectWithIdT<Key, KeyType>,
  Key extends string = 'id',
  KeyType extends string | number = string,
>(arr1: T[], arr2: T[], key: Key = 'id' as Key): T[] {
  const arr1_keys = new Set(arr1.map((a) => a[key]));
  return [...arr1, ...arr2.filter((a) => !arr1_keys.has(a[key]))];
}

export function objectArrayToMap<
  T extends ObjectWithIdT<Key, KeyType>,
  Key extends string = 'id',
  KeyType extends string | number = string,
>(arr: T[], key: Key = 'id' as Key): Map<KeyType, T> {
  return new Map(arr.map((a) => [a[key], a]));
}

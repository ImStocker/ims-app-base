const KNOWN_FIELD_TYPES_MAP = new Map([
  ['boolean', 'boolean'],
  ['checkbox', 'boolean'],
  ['float', 'float'],
  ['integer', 'integer'],
  ['string', 'string'],
  ['text', 'text'],
  ['asset', 'asset'],
  ['gddElementSelector', 'asset'],
]);

export function getFieldTypeDotClass(
  typeValue: string | null | undefined,
): string {
  if (!typeValue) return 'is-type-none';
  const typeCircle = KNOWN_FIELD_TYPES_MAP.get(typeValue);
  return typeCircle ? 'is-type-' + typeCircle : '';
}

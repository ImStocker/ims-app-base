const KNOWN_FIELD_TYPES_MAP = new Map([
  ['boolean', 'boolean'],
  ['checkbox', 'boolean'],
  ['float', 'float'],
  ['number', 'float'],
  ['integer', 'integer'],
  ['string', 'string'],
  ['text', 'text'],
  ['asset', 'asset'],
  ['gddElementSelector', 'asset'],
  ['selection', 'selection'],
  ['enum', 'enum'],
  ['enumRadio', 'enum'],
  ['struct', 'struct'],
  ['dateTime', 'date'],
  ['date', 'date'],
  ['attachment', 'file'],
]);

export function getFieldTypeDotClass(
  typeValue: string | null | undefined,
): string {
  if (!typeValue) return 'is-type-none';
  const typeCircle = KNOWN_FIELD_TYPES_MAP.get(typeValue);
  return typeCircle ? 'is-type-' + typeCircle : '';
}

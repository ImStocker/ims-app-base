const KNOWN_FIELD_TYPES = [
  'boolean',
  'float',
  'integer',
  'string',
  'text',
  'asset',
];

export function getFieldTypeDotClass(
  typeValue: string | null | undefined,
): string {
  if (!typeValue) return '';
  return KNOWN_FIELD_TYPES.includes(typeValue) ? 'is-type-' + typeValue : '';
}

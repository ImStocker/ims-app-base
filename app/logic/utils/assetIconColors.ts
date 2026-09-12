import { ASSET_ICON_COLORS } from '../constants';

export function resolveAssetIconColor(
  color_name: string | null | undefined,
  theme: string,
): string | null {
  if (!color_name) return null;
  const entry = ASSET_ICON_COLORS.find((c) => c.name === color_name);
  if (!entry) return null;
  if (theme === 'ims-light' && entry.light) return entry.light;
  return entry.color;
}

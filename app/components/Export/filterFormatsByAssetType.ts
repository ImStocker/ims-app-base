import type { ExportFormatWithId } from '#logic/project-sub-contexts/ImportExportSubContext';
import type { AssetShort } from '../../logic/types/AssetsType';

export function isFormatBelongToAsset(
  format: ExportFormatWithId,
  baseAsset: AssetShort,
): boolean {
  return !!(
    format.assetType === null ||
    format.assetType?.AssetId === baseAsset.id ||
    (format.assetType?.AssetId &&
      baseAsset.typeIds.includes(format.assetType.AssetId))
  );
}

export function filterFormatsByAssetType(
  formats: ExportFormatWithId[],
  baseAsset: AssetShort,
): ExportFormatWithId[] {
  const filtered_formats: ExportFormatWithId[] = [];
  for (const format of formats) {
    if (isFormatBelongToAsset(format, baseAsset)) {
      filtered_formats.push(format);
    }
  }
  return filtered_formats;
}

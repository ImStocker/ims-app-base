import type { IAppManager } from '../../../../logic/managers/IAppManager';
import CreatorAssetManager from '../../../../logic/managers/CreatorAssetManager';

// ---------------------------------------------------------------------------
// LEGACY wiki-link format.
//
// Old assets were referenced as `[[[display text](#asset:uuid)]]` (a markdown
// link nested inside `[[...]]`), and the autocomplete also allowed the bare
// inner text `[Title](#asset:uuid)` or a plain asset title.
//
// This module is intentionally isolated so the legacy support can be removed
// once all existing documents have been migrated to the new `[[address|label]]`
// format. Do NOT grow it.
// ---------------------------------------------------------------------------

export function parseLegacyWikiLink(text: string): {
  title: string;
  id: string;
} | null {
  const match = text.match(/^\[(.+?)\]\(#asset:([0-9a-f-]+)\)$/i);
  if (match) {
    return { title: match[1].trim(), id: match[2] };
  }
  return null;
}

export function getLegacyCachedAssetFromString(
  asset_string: string,
  appManager: IAppManager,
) {
  const parsed_asset_data = parseLegacyWikiLink(asset_string);
  if (parsed_asset_data) {
    return appManager
      .get(CreatorAssetManager)
      .getAssetShortViaCacheSync(parsed_asset_data.id);
  } else {
    return appManager
      .get(CreatorAssetManager)
      .getAssetShortByTitleViaCacheSync(asset_string);
  }
}

import CreatorAssetManager from '../managers/CreatorAssetManager';
import type { IAppManager } from '../managers/IAppManager';
import type { AssetFullInstanceR } from '../types/AssetFullInstance';
import type { AssetQueryWhere } from '../types/AssetsType';
import type { ApiRequestList } from '../types/ProjectTypes';
import {
  convertAssetPropsToPlainObject,
  type AssetPropsPlainObject,
} from '../types/Props';
import type { JsonSyncExportSegmentFormatOptionsType } from './segments/JsonSyncExportSegment';

function formatAssetFull(asset: AssetFullInstanceR) {
  const asset_full = asset.convertToFull();
  const asset_info: any = { ...asset_full };
  delete asset_info.deletedAt;
  delete asset_info.rights;
  delete asset_info.comments;
  const block_with_names = asset_info.blocks.filter((block) => block.name);
  asset_info.values = {};
  for (const block of block_with_names) {
    const values_block_props = { ...block.props };
    const block_props_keys = Object.keys(values_block_props);
    for (const block_props_key of block_props_keys) {
      if (/^(__).+/.test(block_props_key)) {
        delete values_block_props[block_props_key];
      }
    }
    asset_info.values[block.name] =
      convertAssetPropsToPlainObject(values_block_props);
  }
  asset_info.blocks = asset_full.blocks.map((block) => {
    const new_block: any = { ...block };
    delete new_block.rights;
    new_block.props = convertAssetPropsToPlainObject(block.props);
    new_block.computed = convertAssetPropsToPlainObject(block.computed);
    new_block.inherited = block.inherited
      ? convertAssetPropsToPlainObject(block.inherited)
      : null;
    return { ...new_block };
  });
  return asset_info;
}

export async function getPreparedAssets(
  appManager: IAppManager,
  selection: ApiRequestList<AssetQueryWhere>,
  options:
    | {
        fields: { ref: string; name: string }[];
        kind: 'selectFields';
      }
    | {
        kind: 'full' | 'valuesOnly';
      }
    | {
        fields?: { ref: string; name: string }[];
        kind: JsonSyncExportSegmentFormatOptionsType;
      },
): Promise<AssetPropsPlainObject[]> {
  let prepared_assets: AssetPropsPlainObject[] = [];
  if (options.kind === 'selectFields') {
    const select_fields = options.fields?.length
      ? options.fields.map((field) => {
          return {
            prop: field.ref,
            as: field.name,
          };
        })
      : [];
    prepared_assets = (
      await appManager.get(CreatorAssetManager).getAssetsView(
        {
          ...selection,
          select: [...select_fields],
        },
        {
          folded: true,
        },
      )
    ).list;
  } else {
    const updated_data = await appManager
      .get(CreatorAssetManager)
      .getAssetInstancesList(selection);
    prepared_assets = updated_data.list.map((asset) => formatAssetFull(asset));
    if (options.kind === 'valuesOnly') {
      prepared_assets = prepared_assets.map((asset_info) => {
        return {
          id: asset_info.id,
          title: asset_info.title,
          values: asset_info.values,
        };
      });
    }
  }
  return prepared_assets;
}

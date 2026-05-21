import type { AssetPropValueType } from '../../logic/types/Props';
import { stringifyAssetNewBlockRef } from '../../logic/types/Props';

export function getAssetPropFieldRef({
  block_name,
  block_id,
  prop_key,
}: {
  block_name: string | null;
  block_id: string | null;
  prop_key?: string;
}) {
  let stringified_block_ref: string | null = null;
  if (block_name && block_id) {
    stringified_block_ref = stringifyAssetNewBlockRef(block_name, null);
  } else {
    stringified_block_ref = stringifyAssetNewBlockRef(block_name, block_id);
  }
  return stringified_block_ref + '|' + prop_key;
}
export type AssetPropField = {
  ref: string;
  title: string;
  name: string;
  type?: AssetPropValueType[];
};

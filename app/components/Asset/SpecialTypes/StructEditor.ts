import {
  castAssetPropValueToBoolean,
  castAssetPropValueToString,
  extractAssetPropsSubObject,
  normalizeAssetPropPart,
} from '../../../logic/types/Props';
import type { PropsFormFieldDef } from '../../../logic/types/PropsForm';
import type { ResolvedAssetBlock } from '../../../logic/utils/assets';

export function extractStructFormFields(
  info_block: ResolvedAssetBlock,
  prop_key_prefix = '',
): PropsFormFieldDef[] {
  const res: PropsFormFieldDef[] = [];
  const struct_fields_indices = info_block.computed['fields'];
  if (Array.isArray(struct_fields_indices)) {
    for (const ind of struct_fields_indices) {
      const type = info_block.computed[`fields\\${ind}\\type`];
      const multiple = info_block.computed[`fields\\${ind}\\multiple`];
      const name = info_block.computed[`fields\\${ind}\\name`];
      const title = info_block.computed[`fields\\${ind}\\title`];
      const hint = info_block.computed[`fields\\${ind}\\hint`];
      const params = extractAssetPropsSubObject(
        info_block.computed,
        `fields\\${ind}\\params`,
      );

      const is_hidden = false;
      if (is_hidden) {
        continue;
      }

      if (!name) {
        continue;
      }

      const field_prop_key = normalizeAssetPropPart(
        castAssetPropValueToString(name),
      );
      res.push({
        differentDefinition: false,
        index: ind,
        multiple: castAssetPropValueToBoolean(multiple),
        params,
        propTitle: castAssetPropValueToString(title),
        type: castAssetPropValueToString(type),
        propKey:
          (prop_key_prefix ? prop_key_prefix + '\\' : '') + field_prop_key,
        propName: name ? castAssetPropValueToString(name) : undefined,
        hint,
      });
    }
  }

  return res;
}

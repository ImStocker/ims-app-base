import {
  COLLECTION_GAME_ASSET_ID,
  COLLECTION_PAGE_ASSET_ID,
} from '#logic/constants';
import {
  sameAssetPropValues,
  castAssetPropValueToString,
  castAssetPropValueToBoolean,
  type AssetProps,
  type AssetPropValueEnum,
  isFilledAssetPropValue,
  convertAssetPropsToPlainObject,
  isPropInherited,
  type AssetPropValue,
} from '#logic/types/Props';
import type {
  PropsFormFieldDef,
  PropsFormState,
} from '#logic/types/PropsForm';
import type { ResolvedAssetBlock } from '#logic/utils/assets';

function checkFieldIsHidden(
  block_name: string,
  changed_props: AssetProps,
  prop_name: string,
  assetTypeIds: string[],
) {
  if (block_name === 'props') {
    if (!assetTypeIds.includes(COLLECTION_GAME_ASSET_ID)) {
      return false;
    }

    const type = (changed_props['type'] as AssetPropValueEnum)?.Name;

    let hidden_fields: string[] = [];
    switch (type) {
      case 'Project':
        hidden_fields = [
          ...hidden_fields,
          'application-author',
          'ext-title',
          'ext-link',
          'ext-cover-image',
          'ext-screenshots',
          'ext-genre',
          'ext-description',
          'sent-to-revision-at',
          'rejected-at',
        ];
        break;
      case 'External':
        hidden_fields = [
          ...hidden_fields,
          'application-author',
          'project',
          'sent-to-revision-at',
          'rejected-at',
        ];
        break;
      case 'Application':
        hidden_fields = [
          ...hidden_fields,
          'application-author',
          'ext-title',
          'ext-link',
          'ext-cover-image',
          'ext-screenshots',
          'ext-genre',
          'ext-description',
        ];
        break;
      default:
        hidden_fields = [
          ...hidden_fields,
          'application-author',
          'project',
          'ext-title',
          'ext-link',
          'ext-cover-image',
          'ext-screenshots',
          'ext-description',
          'ext-genre',
          'sent-to-revision-at',
          'rejected-at',
        ];
        break;
    }

    const published_at = isFilledAssetPropValue(changed_props['published-at']);
    const rejected_at = isFilledAssetPropValue(changed_props['rejected-at']);
    const revision_at = isFilledAssetPropValue(
      changed_props['sent-to-revision-at'],
    );

    if (published_at) {
      hidden_fields = [...hidden_fields, 'rejected-at', 'sent-to-revision-at'];
    } else if (rejected_at) {
      hidden_fields = [...hidden_fields, 'published-at', 'sent-to-revision-at'];
    } else if (revision_at) {
      hidden_fields = [...hidden_fields, 'published-at', 'rejected-at'];
    }

    return hidden_fields.includes(prop_name);
  } else if (block_name === 'info') {
    if (!assetTypeIds.includes(COLLECTION_PAGE_ASSET_ID)) {
      return false;
    }

    const published_at = castAssetPropValueToBoolean(
      changed_props['allow-applications'],
    );
    if (!published_at) {
      return prop_name === 'auto-publish';
    }
  }

  return false;
}

export type PropsBlockEntry2 = PropsFormFieldDef;

export function getEmptyPropsBlockEntry2(key: string): PropsBlockEntry2 {
  return {
    index: 1,
    differentDefinition: false,
    multiple: false,
    params: {},
    propKey: key,
    propTitle: '',
    propName: key,
    type: null,
    inheritedProp: false,
  };
}

export type PropsBlockExtractedEntries2 = {
  list: PropsBlockEntry2[];
  map: { [key: string]: PropsBlockEntry2 };
  maxIndex: number;
};

export type PropsBlockEntryAssetPropsPlain = {
  index: number;
  title: string;
  name?: string;
  multiple?: boolean;
  type: string | null;
  hint?: AssetPropValue | null;
  params?: any;
};

export function extractPropsBlockEntries2(
  block: ResolvedAssetBlock,
  assetTypeIds: string[],
): PropsBlockExtractedEntries2 {
  const map: { [key: string]: PropsBlockEntry2 } = {};
  const list: PropsBlockEntry2[] = [];
  let maxIndex = 0;
  const changed_props = block.computed;

  const plain = convertAssetPropsToPlainObject(changed_props);

  if (typeof plain.__props === 'object' && plain.__props) {
    for (const [prop_key, prop_params] of Object.entries(
      plain.__props as {
        [key: string]: Partial<PropsBlockEntryAssetPropsPlain>;
      },
    )) {
      const hidden_val = block.name
        ? checkFieldIsHidden(block.name, changed_props, prop_key, assetTypeIds)
        : false;
      if (hidden_val) continue;

      const prop_inherited = block.inherited
        ? isPropInherited(prop_key, block.props, block.inherited)
        : false;
      const index = prop_params.index ? prop_params.index : 0;
      const entry: PropsBlockEntry2 = {
        inheritedProp: prop_inherited,
        propKey: prop_key,
        propTitle:
          prop_params.title !== undefined
            ? castAssetPropValueToString(prop_params.title)
            : prop_key,
        propName:
          prop_params.name !== undefined
            ? castAssetPropValueToString(prop_params.name)
            : prop_key,
        index: index,
        differentDefinition: false,
        multiple: castAssetPropValueToBoolean(prop_params.multiple ?? false),
        type: prop_params.type
          ? castAssetPropValueToString(prop_params.type)
          : null,
        hint: prop_params.hint,
        params: prop_params.params,
      };
      map[entry.propKey] = entry;
      list.push(entry);
      if (index !== null && maxIndex < index) {
        maxIndex = index;
      }
    }
  }

  list.sort((a, b) => a.index - b.index);
  return {
    maxIndex,
    list,
    map,
  };
}

export function propBlockEntryToAssetPropsPlain(
  entry: PropsBlockEntry2,
): PropsBlockEntryAssetPropsPlain {
  const res: PropsBlockEntryAssetPropsPlain = {
    index: entry.index,
    title: entry.propTitle,
    type: entry.type,
    name: entry.propName,
  };
  if (entry.hint) res.hint = entry.hint;
  if (entry.multiple) res.multiple = entry.multiple;
  if (entry.params) res.params = entry.params;
  return res;
}

export function getPropsBlockUntitledKey2(
  entries: PropsBlockEntry2[],
  title: string = 'untitled',
) {
  const used_keys = new Set(entries.map((ent) => ent.propKey));
  let i;
  for (i = 1; i < 100000; i++) {
    if (!used_keys.has(title + i)) break;
  }
  return title + i;
}

export function extractPropsFormState(
  block: ResolvedAssetBlock,
): PropsFormState {
  const state: PropsFormState = {
    values: {},
    combined: {},
  };

  const changed_props = block.computed;

  const all_keys_set = new Set([...Object.keys(changed_props)]);

  for (const prop_key of all_keys_set) {
    const val = changed_props.hasOwnProperty(prop_key)
      ? changed_props[prop_key]
      : null;
    const prop_inherited = block.inherited
      ? isPropInherited(prop_key, block.props, block.inherited)
      : false;
    const value_inherited =
      prop_inherited && block.props[prop_key] === undefined;

    if (state.values.hasOwnProperty(prop_key)) {
      state.values[prop_key].same = sameAssetPropValues(
        state.values[prop_key].value,
        val,
      );
      state.values[prop_key].computedSame = sameAssetPropValues(
        state.values[prop_key].computedValue,
        val,
      );
      if (state.values[prop_key].computedState === true) {
        state.values[prop_key].computedState = true;
      }
      state.values[prop_key].inherited =
        state.values[prop_key].inherited && value_inherited;
    } else {
      state.values[prop_key] = {
        value: val,
        computedValue: val,
        computedState: true,
        computedSame: true,
        inherited: value_inherited,
        same: true,
      };
      state.combined[prop_key] = val;
    }
  }

  return state;
}

import validator from 'validator';
import { useAppManager } from '../../composables/useAppManager';
import {
  AssetPropType,
  castAssetPropValueToString,
  getAssetPropType,
  isFilledAssetPropValue,
  type AssetPropValue,
  type AssetPropValueAccount,
} from '../../logic/types/Props';

export default function useImcTextPropRenderer() {
  const appManager = useAppManager();
  return (params: { value?: AssetPropValue; inline?: boolean }): string => {
    let content: string;

    if (!isFilledAssetPropValue(params.value ?? null)) {
      content = `<span class="ImcTextProp-empty"></span>`;
    } else {
      const prop_type = getAssetPropType(params.value!);
      const string_value = castAssetPropValueToString(params.value ?? null);
      const $t = appManager.$t;
      switch (prop_type) {
        case AssetPropType.ACCOUNT: {
          const account_value = (params.value as AssetPropValueAccount)
            ?.AccountId
            ? (params.value as AssetPropValueAccount)
            : null;
          if (!account_value) {
            content = `<span class="ImcTextPropAccount state-error">${validator.escape($t('common.notFound'))}: ${validator.escape(string_value)}</span>`;
          } else {
            content = `<span class="ImcTextPropAccount">${validator.escape(string_value)}</span>`;
          }
          break;
        }
        default: {
          content = `<span class="ImcTextProp-other">${validator.escape(string_value)}</span>`;
        }
      }
    }

    return `<span class="ImcTextProp ${params.inline ? 'type-inline' : ''}">${content}</span>`;
  };
}

import type { AssetPropValueAccount } from '../../../logic/types/Props';

export function formatImcTextPropAccount(value: AssetPropValueAccount) {
  return '@' + value.Name;
}

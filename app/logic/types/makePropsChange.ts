import type { AssetProps } from './Props';

export function makeRenamePropKeys(renameMap: {
  [oldkey: string]: string;
}): AssetProps {
  return Object.fromEntries(
    Object.entries(renameMap).map(([oldkey, newkey]) => [`~${oldkey}`, newkey]),
  );
}

export function makeRenamePropKey(
  oldPropKey: string,
  newPropKey: string,
): AssetProps {
  return {
    [`~${oldPropKey}`]: newPropKey,
  };
}

export function makeDeletePropKeys(propKeys: string[]): AssetProps {
  return Object.fromEntries(propKeys.map((key) => [`~${key}`, null]));
}

export function makeDeletePropKey(propKey: string) {
  return {
    [`~${propKey}`]: null,
  };
}

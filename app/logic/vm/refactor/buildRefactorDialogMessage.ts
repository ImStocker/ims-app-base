import type { AssetWhereParams } from '../../types/AssetsType';
import type { AssetProps } from '../../types/Props';
import type { RefactorChange, RefactorEnumChange } from './refactorTypes';

export type RefactorMessageT = (
  key: string,
  params?: Record<string, unknown>,
) => string;

const MAX_LISTED_CHANGES = 8;

export type RefactorDialogMessageParams = {
  changes: RefactorChange[];
  affectedCount: number;
  skippedCount: number;
  hasEnum: boolean;
  t: RefactorMessageT;
};

function isDerivedKeyChange(change: RefactorChange): boolean {
  if (change.kind !== 'key') return false;
  if (change.from.startsWith('__props\\')) return true;
  return /^[^\\]+\\values\\/.test(change.from);
}

function describeChange(change: RefactorChange, t: RefactorMessageT): string {
  switch (change.kind) {
    case 'key':
      return change.to === null
        ? t('assetEditor.refactor.keyDelete', { from: change.from })
        : t('assetEditor.refactor.keyRename', {
            from: change.from,
            to: change.to,
          });
    case 'block':
      return change.delete
        ? t('assetEditor.refactor.blockDelete', { from: change.from })
        : t('assetEditor.refactor.blockRename', {
            from: change.from,
            to: change.newName ?? '',
          });
    case 'primary':
      return t('assetEditor.refactor.primaryChange', {
        value: change.value ?? '',
      });
    case 'enum':
      return change.oldName === change.newName
        ? t('assetEditor.refactor.enumTitleChange', { name: change.newName })
        : t('assetEditor.refactor.enumRename', {
            from: change.oldName,
            to: change.newName,
          });
  }
}

export function buildRefactorDialogMessage(
  params: RefactorDialogMessageParams,
): string {
  const { t } = params;
  const visible = params.changes.filter(
    (change) => !isDerivedKeyChange(change),
  );
  const lines: string[] = [];

  for (const change of visible.slice(0, MAX_LISTED_CHANGES)) {
    lines.push(describeChange(change, t));
  }
  const hidden = visible.length - MAX_LISTED_CHANGES;
  if (hidden > 0) {
    lines.push(t('assetEditor.refactor.moreChanges', { count: hidden }));
  }

  if (params.affectedCount > 0) {
    lines.push(
      t('assetEditor.refactor.childrenCount', {
        count: params.affectedCount,
      }),
    );
  }
  if (params.skippedCount > 0) {
    lines.push(
      t('assetEditor.refactor.skippedRights', {
        count: params.skippedCount,
      }),
    );
  }
  if (params.hasEnum && params.affectedCount === 0) {
    lines.push(t('assetEditor.refactor.enumTargets'));
  }

  return lines.filter((line) => !!line).join('\n');
}

export type EnumReplaceRequest = {
  where: AssetWhereParams;
  find: AssetProps;
  replace: AssetProps;
  options: { wholeProp: boolean };
};

export function buildEnumReplaceRequest(
  enum_asset_id: string,
  change: RefactorEnumChange,
): EnumReplaceRequest {
  return {
    where: {},
    find: {
      '': {
        Enum: enum_asset_id,
        Name: change.oldName,
        Title: change.oldTitle ?? '',
      },
    },
    replace: {
      '': {
        Enum: enum_asset_id,
        Name: change.newName,
        Title: change.newTitle ?? '',
      },
    },
    options: { wholeProp: true },
  };
}

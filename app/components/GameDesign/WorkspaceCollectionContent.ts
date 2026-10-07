import { BLOCK_NAME_META } from '../../logic/constants';
import EditorManager from '../../logic/managers/EditorManager';
import type { IAppManager } from '../../logic/managers/IAppManager';
import type { AssetFullInstanceR } from '../../logic/types/AssetFullInstance';
import { stringifyAssetNewBlockRef } from '../../logic/types/Props';
import type { PropsFormFieldDef } from '../../logic/types/PropsForm';
import type { ImcGridColumn } from '../ImcGrid/ImcGrid';
import type { UserViewProp } from '../ViewOptions/viewUtils';

export type SavedWorkspaceCollectionPreferences = {
  columns?: {
    [name: string]: {
      width?: number;
    };
  };
};

export type ViewProperty = {
  prop: UserViewProp;
  title: string;
  isSelected: boolean;
};

export type WorkspaceCollectionColumn = ImcGridColumn & {
  blockRef: string;
  isSelected?: boolean;
};

export function gatherColumns(
  asset: AssetFullInstanceR,
  app_manager: IAppManager,
  withAuxiliary: boolean,
): WorkspaceCollectionColumn[] {
  let columns: WorkspaceCollectionColumn[] = [];
  for (const block of asset.blocks) {
    if (block.name === BLOCK_NAME_META) {
      continue;
    }
    const fields: PropsFormFieldDef[] = [];
    const current_block_controller = app_manager
      .get(EditorManager)
      .getBlockTypesMap()[block.type];
    if (!current_block_controller) {
      continue;
    }
    const current_block_variables =
      current_block_controller.getBlockProvidedVariables(
        asset,
        {
          ...block,
          rights: asset.rights,
          references: [],
          assetId: asset.id,
        },
        app_manager,
      );
    for (const variable of current_block_variables) {
      if (!withAuxiliary && variable.auxiliary) {
        continue;
      }
      fields.push(variable.field);
    }
    if (fields.length > 0) {
      const block_ref = stringifyAssetNewBlockRef(
        block.name,
        block.name ? null : block.id,
      );
      columns = [
        ...columns,
        ...fields.map((field) => {
          const propKey = block_ref + '|' + field.propKey;
          return {
            ...field,
            propKey: propKey,
            name: propKey,
            blockRef: block_ref,
            width: field.type === 'text' ? 200 : 100,
          };
        }),
      ];
    }
  }

  return columns;
}

export function getColumnServiceName(
  column: ImcGridColumn & { blockRef?: string },
): string | null {
  const block_ref = column.blockRef;
  if (!block_ref) return null;
  const prop_key_prefix = block_ref + '|';
  const field_key = column.propKey.startsWith(prop_key_prefix)
    ? column.propKey.slice(prop_key_prefix.length)
    : column.propKey;
  if (!field_key) return null;
  if (field_key === 'value') return block_ref;
  return block_ref + '.' + field_key;
}

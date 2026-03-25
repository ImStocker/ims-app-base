import type { UserViewProp } from '#components/Workspace/ViewOptions/viewUtils';
import EditorSubContext from '#logic/project-sub-contexts/EditorSubContext';
import type { IProjectContext } from '#logic/types/IProjectContext';
import { BLOCK_NAME_META } from '../../logic/constants';
import type { AssetFullInstanceR } from '../../logic/types/AssetFullInstance';
import { stringifyAssetNewBlockRef } from '../../logic/types/Props';
import type { PropsFormFieldDef } from '../../logic/types/PropsForm';
import type { ImcGridColumn } from '../ImcGrid/ImcGrid';

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
  projectContext: IProjectContext,
): WorkspaceCollectionColumn[] {
  let columns: WorkspaceCollectionColumn[] = [];
  for (const block of asset.blocks) {
    if (block.name === BLOCK_NAME_META) {
      continue;
    }
    const fields: PropsFormFieldDef[] = [];
    const current_block_controller = projectContext
      .get(EditorSubContext)
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
        projectContext,
      );
    for (const variable of current_block_variables) {
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

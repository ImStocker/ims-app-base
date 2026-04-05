import { extractPropsBlockEntries2 } from './PropsBlock';
import type {
  AssetLocalizableField,
  ResolvedAssetBlock,
} from '#logic/utils/assets';
import type { AssetFullInstanceR } from '#logic/types/AssetFullInstance';
import {
  BlockTypeDefinition,
  type BlockProvidedVariable,
} from '#logic/types/BlockTypeDefinition';
import type { PropsFormFieldDef } from '#logic/types/PropsForm';
import type { IProjectContext } from '#logic/types/IProjectContext';
import EditorSubContext from '#logic/project-sub-contexts/EditorSubContext';

function gatherPropsColumns(
  asset: AssetFullInstanceR,
  block: ResolvedAssetBlock,
): PropsFormFieldDef[] {
  const extracted = extractPropsBlockEntries2(
    {
      ...block,
    },
    asset.typeIds,
  );

  return extracted.list;
}

export class PropsBlockDefinition extends BlockTypeDefinition {
  name = 'props';
  component = async () => (await import('./PropsBlock.vue')).default;
  icon = 'table-2';

  override getBlockProvidedVariables(
    asset: AssetFullInstanceR,
    resolved_block: ResolvedAssetBlock,
    projectContext: IProjectContext,
  ): BlockProvidedVariable[] {
    const fields = gatherPropsColumns(asset, resolved_block);
    const variables: BlockProvidedVariable[] = [];
    for (const field of fields) {
      const field_controller = field.type
        ? projectContext.get(EditorSubContext).getFieldTypesMap()[field.type]
        : undefined;

      if (!field.propTitle) continue;

      variables.push({
        field,
        blockId: resolved_block.id,
        blockName: resolved_block.name,
        dataType: field_controller?.dataTypes ?? [],
        name: field.propName ? field.propName : field.propKey,
        title: field.propTitle ? field.propTitle : field.propKey,
      });
    }
    return variables;
  }

  override getBlockLocalizableFields(
    asset: AssetFullInstanceR,
    resolved_block: ResolvedAssetBlock,
  ): AssetLocalizableField[] {
    const fields = gatherPropsColumns(asset, resolved_block);
    const res: AssetLocalizableField[] = [];
    for (const field of fields) {
      if (field.type === 'text' || field.type === 'string') {
        res.push({
          propKey: field.propKey,
          localeKey: field.propName ? field.propName : field.propKey,
          title: field.propTitle ? field.propTitle : field.propKey,
          type: field.type,
        });
      }
    }
    return res;
  }
}

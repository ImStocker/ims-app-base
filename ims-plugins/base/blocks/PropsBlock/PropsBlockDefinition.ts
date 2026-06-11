import { extractPropsBlockEntries2 } from './PropsBlock';
import EditorManager from '#logic/managers/EditorManager';
import type { IAppManager } from '#logic/managers/IAppManager';
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
  override aiSpec =
    'This block stores a table of named properties. Each property row consists of: a value stored directly at `{propKey}` as AssetPropValue (null, string, number, boolean, number[], or an object like AssetPropValueText {Str, Ops}, AssetPropValueFile {FileId, Title, Size, Dir, Store}, AssetPropValueAsset {AssetId, Title, Name}, AssetPropValueEnum {Enum, Name, Title}, AssetPropValueAccount {AccountId, Name}, AssetPropValueTimestamp {Str, Ts}, AssetPropValueProject {ProjectId, Title}, etc.); plus metadata stored under `__props\\{propKey}\\` containing index (number), title (string), name (string, optional), type (string | null — field type controller: "text", "string", "number", "integer", "checkbox", "enum", "enumRadio", "date", "dateTime", "email", "phone", "assetSelector", "attachment", "struct", "textAttachment", "textCut", "attributeType", "projectUser", "nameTitle", "gddElementSelector", "buttonDateTime", "fieldParams"), multiple (boolean — if true, value is stored as array with sub-keys), hint (string, optional), and params (AssetProps, controller-specific sub-fields).';

  override getBlockProvidedVariables(
    asset: AssetFullInstanceR,
    resolved_block: ResolvedAssetBlock,
    app_manager: IAppManager,
  ): BlockProvidedVariable[] {
    const fields = gatherPropsColumns(asset, resolved_block);
    const variables: BlockProvidedVariable[] = [];
    for (const field of fields) {
      const field_controller = field.type
        ? app_manager.get(EditorManager).getFieldTypesMap()[field.type]
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

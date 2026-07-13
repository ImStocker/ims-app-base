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
    'PropsBlock stores a flexible table of named key-value properties on an asset. ' +
    'Use it to add structured metadata, settings, or any set of named fields — such as dates, numbers, text, links to assets, files, enums, project users, etc.\n\n' +
    'Each property is stored as:\n' +
    '- `{propKey}` — the value itself (type depends on the field controller; see the "AssetPropValue types" leaf value reference for possible shapes)\n' +
    '- `__props\\{propKey}\\index` — sort order (number)\n' +
    '- `__props\\{propKey}\\title` — display title (string)\n' +
    '- `__props\\{propKey}\\name` — optional service name (string)\n' +
    '- `__props\\{propKey}\\type` — field type controller name (string | null). Determines how the value is edited and presented; see the "Field type controllers reference" section.\n' +
    '- `__props\\{propKey}\\multiple` — if true, the value is stored as an array with numeric sub-keys (boolean)\n' +
    '- `__props\\{propKey}\\hint` — optional hint/description (string)\n' +
    '- `__props\\{propKey}\\params` — controller-specific sub-fields (object)\n\n' +
    'Example (character config PropsBlock with various field types):\n' +
    '{\n' +
    '  "max_health": 100,\n' +
    '  "__props\\\\max_health\\\\type": "integer",\n' +
    '  "__props\\\\max_health\\\\index": 1,\n' +
    '  "__props\\\\max_health\\\\title": "Max Health",\n' +
    '  "description": { "Str": "A seasoned hero forged in battle.\\n", "Ops": [{ "insert": "A seasoned hero forged in battle.\\n" }] },\n' +
    '  "__props\\\\description\\\\type": "text",\n' +
    '  "__props\\\\description\\\\index": 2,\n' +
    '  "__props\\\\description\\\\title": "Description",\n' +
    '  "difficulty": { "Enum": "game_difficulty", "Name": "hard", "Title": "Hard" },\n' +
    '  "__props\\\\difficulty\\\\type": "enum",\n' +
    '  "__props\\\\difficulty\\\\index": 3,\n' +
    '  "__props\\\\difficulty\\\\title": "Difficulty",\n' +
    '  "icon": { "AssetId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "Title": "WarriorIcon", "Name": "warrior_icon" },\n' +
    '  "__props\\\\icon\\\\type": "assetSelector",\n' +
    '  "__props\\\\icon\\\\index": 4,\n' +
    '  "__props\\\\icon\\\\title": "Icon",\n' +
    '  "voice_actor": { "AccountId": "42", "Name": "John Smith" },\n' +
    '  "__props\\\\voice_actor\\\\type": "projectUser",\n' +
    '  "__props\\\\voice_actor\\\\index": 5,\n' +
    '  "__props\\\\voice_actor\\\\title": "Voice Actor",\n' +
    '  "__props\\\\voice_actor\\\\hint": "Select the voice actor for this character",\n' +
    '  "unlock_date": { "Ts": 1767225600, "Str": "2025-12-31T20:00:00.000Z" },\n' +
    '  "__props\\\\unlock_date\\\\type": "dateTime",\n' +
    '  "__props\\\\unlock_date\\\\index": 6,\n' +
    '  "__props\\\\unlock_date\\\\title": "Unlock Date"\n' +
    '}';

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

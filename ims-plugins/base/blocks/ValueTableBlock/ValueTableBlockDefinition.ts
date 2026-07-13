import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';
import type { IAppManager } from '#logic/managers/IAppManager';
import type { AssetProps } from '#logic/types/Props';
import { assignPlainValueToAssetProps } from '#logic/types/Props';

export class ValueTableDefinition extends BlockTypeDefinition {
  name = 'table';
  component = async () => (await import('./ValueTableBlock.vue')).default;
  icon = 'table-line';
  override aiSpec =
    'ValueTableBlock stores a spreadsheet-like data table with columns and rows. ' +
    'Use it for structured tabular data: enemy stats, weapon catalogs, quest reward tables, inventory lists, ' +
    'level progression charts, or any data best represented as a grid with named columns.\n\n' +
    'Structure:\n' +
    '- `__columns\\{colName}\\title` — display title (string)\n' +
    '- `__columns\\{colName}\\index` — column sort order (number)\n' +
    '- `__columns\\{colName}\\type` — field type controller name (string, optional). Determines how cells in this column are edited and presented. See the "Field type controllers reference" section.\n' +
    '- `__columns\\{colName}\\multiple` — if true, cell values are stored as arrays (boolean)\n' +
    '- `__columns\\{colName}\\width` — column width hint (string | number, optional)\n' +
    '- `__columns\\{colName}\\hint` — optional hint text (string)\n' +
    '- `__columns\\{colName}\\params` — controller-specific sub-fields (object)\n' +
    '- `__primary` — primary column name (string | null). Identifies the column that serves as the row key.\n' +
    "- `_{rowNum}\\values\\{colName}` — cell value (AssetPropValue, type matches the column's field type)\n" +
    '- `_{rowNum}\\asset` — linked asset reference (AssetPropValueAsset | null)\n' +
    '- `_{rowNum}\\index` — row sort order (number)\n\n' +
    'Example (weapon stats table):\n' +
    '{\n' +
    '  "__primary": "name",\n' +
    '  "__columns\\\\name\\\\title": "Weapon Name",\n' +
    '  "__columns\\\\name\\\\index": 1,\n' +
    '  "__columns\\\\damage\\\\title": "Damage",\n' +
    '  "__columns\\\\damage\\\\type": "integer",\n' +
    '  "__columns\\\\damage\\\\index": 2,\n' +
    '  "__columns\\\\type\\\\title": "Type",\n' +
    '  "__columns\\\\type\\\\index": 3,\n' +
    '  "__columns\\\\price\\\\title": "Price",\n' +
    '  "__columns\\\\price\\\\type": "integer",\n' +
    '  "__columns\\\\price\\\\index": 4,\n' +
    '  "_1\\\\values\\\\name": "Iron Sword",\n' +
    '  "_1\\\\values\\\\damage": 15,\n' +
    '  "_1\\\\values\\\\type": { "Enum": "weapon_type", "Name": "melee", "Title": "Melee" },\n' +
    '  "_1\\\\values\\\\price": 100,\n' +
    '  "_1\\\\asset": null,\n' +
    '  "_1\\\\index": 1,\n' +
    '  "_2\\\\values\\\\name": "War Bow",\n' +
    '  "_2\\\\values\\\\damage": 22,\n' +
    '  "_2\\\\values\\\\type": { "Enum": "weapon_type", "Name": "ranged", "Title": "Ranged" },\n' +
    '  "_2\\\\values\\\\price": 250,\n' +
    '  "_2\\\\asset": null,\n' +
    '  "_2\\\\index": 2,\n' +
    '  "_3\\\\values\\\\name": "Mage Staff",\n' +
    '  "_3\\\\values\\\\damage": 18,\n' +
    '  "_3\\\\values\\\\type": { "Enum": "weapon_type", "Name": "magic", "Title": "Magic" },\n' +
    '  "_3\\\\values\\\\price": 300,\n' +
    '  "_3\\\\asset": { "AssetId": "abc123-def456", "Title": "Mage Staff Art", "Name": "mage_staff_art" },\n' +
    '  "_3\\\\index": 3\n' +
    '}';

  override async beforeBlockCreate(
    appManager: IAppManager,
    params: { title: string | null },
  ): Promise<{ title: string | null; props?: AssetProps } | undefined> {
    const props: AssetProps = {};
    assignPlainValueToAssetProps(props, {
      __columns: {
        num: {
          title: appManager.$t('assetEditor.tableBlockDefaultNumColTitle'),
          index: 1,
        },
        value: {
          title: appManager.$t('assetEditor.tableBlockDefaultValueColTitle'),
          index: 2,
        },
      },
      __primary: 'num',
      _1: {
        values: {
          num: 1,
          value: null,
        },
        asset: null,
        index: 1,
      },
    });

    return {
      title: params.title,
      props,
    };
  }
}

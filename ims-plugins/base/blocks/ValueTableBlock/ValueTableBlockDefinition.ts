import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';
import type { IAppManager } from '#logic/managers/IAppManager';
import type { AssetProps } from '#logic/types/Props';
import { assignPlainValueToAssetProps } from '#logic/types/Props';

export class ValueTableDefinition extends BlockTypeDefinition {
  name = 'table';
  component = async () => (await import('./ValueTableBlock.vue')).default;
  icon = 'table-line';
  override aiSpec =
    'This block stores a spreadsheet-like data table. Props structure: `__columns` ({ [colName: string]: { title: string, index: number, type?: string (prop type like "text"|"number"|"integer"|"boolean"|"string"), multiple?: boolean, width?: string | number, hint?: string, params?: AssetProps } }) — column definitions; `__primary` (string | null) — primary column name for row identification. Rows stored as `_{rowNum}\\values\\{colName}` (AssetPropValue per cell), `_{rowNum}\\asset` (AssetPropValueAsset | null — linked asset), `_{rowNum}\\index` (number). Each row has: id (string), primaryValue, index, asset, per-cell values.';

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

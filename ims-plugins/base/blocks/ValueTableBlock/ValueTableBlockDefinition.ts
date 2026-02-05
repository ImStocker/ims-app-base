import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';
import type { IAppManager } from '#logic/managers/IAppManager';
import type { AssetProps } from '#logic/types/Props';
import { assignPlainValueToAssetProps } from '#logic/types/Props';

export class ValueTableDefinition extends BlockTypeDefinition {
  name = 'table';
  component = async () => (await import('./ValueTableBlock.vue')).default;
  icon = 'table-line';

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

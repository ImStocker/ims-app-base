import type { AssetQueryWhere } from './AssetsType';
import type { AssetProps } from './Props';
import type { AssetRights } from './Rights';

export type BlockParamsProps = {
  asset?: string;
  name?: string | null;
  title?: string | null;
  index?: number;
  props?: string;
};

// export type BlockQueryWhere = {
//     asset: string,
// }

// export type BlockQuery = {
//   where?: BlockQueryWhere
// }

export type ChangeBlockParams = Partial<AssetBlockChangable> & {
  delete?: true;
  empty?: true;
};

export type ChangeBlock = {
  blockName: null | string;
  blockTitle: null | string;
  blockType: string;
  change: ChangeBlockParams;
};

export type ChangeBlockRequest = ChangeBlock & {
  where: AssetQueryWhere;
};

export type AssetBlockEntity = AssetBlockDraft & {
  createdAt: string;
  updatedAt: string;
  ownTitle: string | null;
  own: boolean;
  inherited: AssetProps | null;
  computed: AssetProps;
  rights: AssetRights;
};

export type AssetBlockDraft = AssetBlockChangable & {
  id: string;
  type: string;
};

export type AssetBlockChangable = {
  name: string | null;
  title: string | null;
  index: number;
  props: AssetProps;
};

import type { AssetCompletionMeta } from '../../components/Asset/Completion/AssetCompletion';
import type { AssetBlockEntity } from './BlocksType';
import type { AssetCommentDTO } from './CommentTypes';
import type { User } from './ProjectTypes';
import type { AssetPropValue } from './Props';
import type { AssetPropWhereCondition } from './PropsWhere';
import type { AssetRights } from './Rights';
import type { Workspace } from './Workspaces';

export type AssetPropsParamsDTO = {
  [x: string]: AssetPropValue;
};

export class AssetBlockParamsDTO {
  name?: string | null;
  title?: string | null;
  type?: string;
  index?: number;
  delete?: true;
  reset?: true;
  props?: AssetPropsParamsDTO | AssetPropsParamsDTO[];
}

export type AssetSetDTO = {
  parentIds?: string[];
  name?: string | null;
  title?: string | null;
  icon?: string | null;
  workspaceId?: string | null;
  isAbstract?: boolean;
  index?: number | null;
  creatorUserId?: string;
  blocks?: {
    [blockKey: string]: AssetBlockParamsDTO;
  };
  delete?: true;
  restore?: true;
};

export type AssetCreateDTO = {
  id?: string;
  set?: AssetSetDTO;
};

export type AssetChangeContent = AssetSetDTO & {
  delete?: true;
  restore?: true;
};

export type AssetWhereParams = {
  [field: string]: AssetPropWhereCondition | undefined;
};

export type AssetChangeDTO = {
  set: AssetSetDTO;
  where: AssetWhereParams;
};

export type AssetChangeBatchOpDTO = {
  create?: boolean | { id?: string | null };
  set: AssetSetDTO;
  where?: AssetWhereParams;
};

export type CreateRefDTO = {
  where: AssetWhereParams;
  blockId?: null | string;
  targetAssetId: string;
  targetBlockId?: null | string;
};

export type AssetWhereRequest = {
  where: AssetWhereParams;
};

export type AssetQueryWhere = {
  [param: string]: any;
  query?: string;
  id?: string | string[];
  workspaceId?: string | null;
};

export type AssetShort = {
  id: string;
  projectId: string;
  workspaceId: string | null;
  name: string | null;
  title: string | null;
  icon: string | null;
  isAbstract: boolean;
  typeIds: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  rights: number;
  index: number | null;
  creatorUserId: string | null;
  unread?: number;
  hasImage: boolean;
  localName?: string;
};

export type AssetPreviewInfo = AssetCompletionMeta & {
  id: string;
  title: string | null;
  name: string | null;
  icon: string | null;
  mainImage: {
    type: string;
    value: AssetPropValue;
  } | null;
  description: AssetPropValue | null;
  isAbstract: boolean;
  rights: AssetRights;
};

export type AssetLink = {
  id: string;
  title?: string | null;
  name?: string | null;
  icon?: string | null;
  blockId?: string;
  anchor?: string;
};

export type AssetForSelection = {
  id: string;
  title: string | null;
  name: string | null;
  icon: string | null;
};

export type WorkspaceForSelection = {
  id: string;
  title: string | null;
  name: string | null;
};

export type AssetFull = AssetShort & {
  parentIds: string[];
  ownTitle: string | null;
  ownIcon: string | null;
  blocks: AssetBlockEntity[];
  comments: AssetCommentDTO[];
  references: AssetReferenceEntity[];
  lastViewedAt?: string | null;
};

export type AssetForEdit = AssetShort & {
  parentIds: string[];
  ownTitle: string | null;
  ownIcon: string | null;
  blocks: AssetBlockEntity[];
  references: AssetReferenceEntity[];
};

export type AssetsFullResult = {
  ids: string[];
  objects: {
    assetFulls: {
      [key: string]: AssetFull;
    };
    assetShorts: {
      [key: string]: AssetShort;
    };
    workspaces: {
      [key: string]: Workspace;
    };
    users: {
      [key: string]: User;
    };
  };
  total: number;
};

export type AssetsChangeResult = AssetsFullResult & {
  changeId: string | null;
};

export type AssetsBatchChangeResultDTO = AssetsChangeResult & {
  createdIds: string[];
  updatedIds: string[];
  deletedIds: string[];
};

export function createEmptyAssetFullResult(): AssetsFullResult {
  return {
    ids: [],
    objects: {
      assetFulls: {},
      assetShorts: {},
      users: {},
      workspaces: {},
    },
    total: 0,
  };
}

export type AssetsShortResult = {
  list: AssetShort[];
  objects: {
    workspaces: {
      [key: string]: Workspace;
    };
    users: {
      [key: string]: User;
    };
  };
  total: number;
};
export type AssetReferenceCommonEntity = {
  sourceBlockId: string | null;
  targetAssetId: string;
  targetBlockId: string | null;
};

export type AssetReferenceEntity = AssetReferenceCommonEntity & {
  createdAt: string;
};

export type AssetReferencesResult = {
  ids: string[];
  refs: { [assetId: string]: AssetReferenceEntity[] };
  total: number;
};

export type AssetsGraphItem = {
  source: string;
  target: string;
  type: 'inherit' | 'mention' | 'formula' | 'reference' | 'task';
};

export type AssetsGraph = {
  list: AssetsGraphItem[];
  more: boolean;
  objects: {
    assets: {
      [key: string]: AssetShort;
    };
  };
};

export type AssetDeleteResultDTO = {
  ids: string[];
  changeId: string | null;
};

export type AssetDeleteRefResultDTO = {
  ids: string[];
};

export type AssetMoveParams = {
  workspaceId?: string | null;
  indexFrom?: number;
  indexTo?: number;
  ids: string[];
};

export type AssetMoveResultItem = {
  id: string;
  workspaceId: string | null;
  index: number | null;
};

export type AssetMoveResult = {
  list: AssetMoveResultItem[];
  changeId: string | null;
};

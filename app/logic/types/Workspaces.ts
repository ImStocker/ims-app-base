import type { AssetProps } from './Props';
import type { AssetPropWhere } from './PropsWhere';

export type WorkspaceType = {
  id_parent?: string;
  id_project: string;
  title: string;
};

export type WorkspaceLink = {
  id: string;
  title?: string | null;
  name?: string | null;
};

export type WorkspaceQueryDTOWhere = {
  parentId?: string | null;
  ids?: string[];
  names?: string[];
  isSystem?: boolean;
  query?: string;
  scope?: string;
  insideId?: string | null;
  hasAssets?: AssetPropWhere | boolean;
  isRoot?: boolean;
};

export type ChangeWorkspaceRequest = {
  parentId?: string | null;
  title?: string;
  name?: string | null;
  index?: number | null;
  props?: AssetProps | null;
};

export type Workspace = {
  id: string;
  title: string;
  name: string | null;
  parentId: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  rights: number;
  index: number | null;
  props: AssetProps;
  unread?: number;
  localName?: string;
};

export type WorkspaceMoveParams = {
  parentId?: string | null;
  indexFrom?: number;
  indexTo?: number;
  ids: string[];
};

export type WorkspaceMoveResultItem = {
  id: string;
  parentId: string | null;
  index: number | null;
};

export type WorkspaceMoveResult = {
  list: WorkspaceMoveResultItem[];
};

export const WORKSPACE_TYPE_COLLECTION = 'collection';
export const WORKSPACE_TYPE_TASKBOARD = 'taskboard';

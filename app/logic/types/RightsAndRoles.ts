import type { AssetRights } from './Rights';
import type { UserWithNameDTO } from './UserType';

export type EditRoleDTO = {
  title?: string;
  isDefault?: boolean;
};

export type AddRoleDTO = EditRoleDTO & {
  title: string;
};

export type ProjectFullRole = {
  projectId: string;
  num: number;
  title: string;
  isAdmin: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  defaultAssetRights: AssetRights;
  defaultWorkspaceRights: AssetRights;
};
export type WorkspaceDTO = {
  id: string;
  title: string;
  name: string | null;
  projectId: string;
  parentId: string;
  createdAt: Date;
  updatedAt: Date;
  index: number | null;
};
export type RoleWorkspaceRightsGetDTO = {
  workspace: WorkspaceDTO;
  rights: AssetRights;
};

export type RoleWorkspaceRightsChangeDTOOne = {
  workspaceId: string;
  roleNum: number;
  rights: AssetRights | null;
};

export type RoleAssetRightsChangeDTOOne = {
  assetId: string;
  roleNum: number;
  rights: AssetRights | null;
};

export enum ProjectRightsInspectResponseRightType {
  OWN = 'own',
  WORKSPACE = 'workspace',
  DEFAULT = 'default',
}

export type ProjectRightsInspectResponseRoleDTO = {
  roleNum: number;
  rights: AssetRights;
  type: ProjectRightsInspectResponseRightType;
};

export type ProjectRightsInspectResponseUserDTO = {
  userId: number;
  rights: AssetRights;
  type: ProjectRightsInspectResponseRightType;
};

export type ProjectRightsInspectResponseDTO = {
  roleRights: ProjectRightsInspectResponseRoleDTO[];
  userRights: ProjectRightsInspectResponseUserDTO[];
  objects: {
    roles: { [roleNum: string]: ProjectFullRole };
    users: { [userId: string]: UserWithNameDTO };
  };
};

import type { ProjectRolePulseRights } from './ProjectTypes';
import type { AssetRights } from './Rights';
import type { UserWithNameDTO } from './UserType';

export type ProjectSubscriptionInspectFullRole = {
  projectId: string;
  num: number;
  title: string;
  isAdmin: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  defaultAssetRights: AssetRights;
  defaultWorkspaceRights: AssetRights;
  pulseRights: ProjectRolePulseRights;
  rolesAssign: number[] | null;
  rolesView: number[] | null;
};

export enum ProjectSubscriptionInspectResponseRightType {
  OWN = 'own',
  WORKSPACE = 'workspace',
}

export type ProjectSubscriptionInspectResponseRoleDTO = {
  roleNum: number;
  subscribedChange: boolean | null;
  subscribedComment: boolean | null;
  type: ProjectSubscriptionInspectResponseRightType;
};

export type ProjectSubscriptionInspectResponseUserDTO = {
  userId: number;
  subscribedChange: boolean | null;
  subscribedComment: boolean | null;
  type: ProjectSubscriptionInspectResponseRightType;
};

export type ProjectSubscriptionInspectResponseObjectsDTO = {
  roles: {
    [key: string]: ProjectSubscriptionInspectFullRole;
  };
  users: {
    [key: string]: UserWithNameDTO;
  };
};

export type ProjectSubscriptionInspectResponseDTO = {
  byRole: ProjectSubscriptionInspectResponseRoleDTO[];
  byUser: ProjectSubscriptionInspectResponseUserDTO[];
  objects: ProjectSubscriptionInspectResponseObjectsDTO;
};

export type RoleWorkspaceSubscriptionChangeDTOOne = {
  workspaceId: string;
  roleNum: number;
  subscribedChange?: boolean | null;
  subscribedComment?: boolean | null;
};

export type RoleAssetSubscriptionChangeDTOOne = {
  assetId: string;
  roleNum: number;
  subscribedChange?: boolean | null;
  subscribedComment?: boolean | null;
};

export type MemberAssetSubscriptionChangeDTOOne = {
  assetId: string;
  userId: number;
  subscribedChange?: boolean | null;
  subscribedComment?: boolean | null;
};

export type MemberAssetSubscriptionChangeDTO = {
  changes: MemberAssetSubscriptionChangeDTOOne[];
};

export type MemberWorkspaceSubscriptionChangeDTOOne = {
  workspaceId: string;
  userId: number;
  subscribedChange?: boolean | null;
  subscribedComment?: boolean | null;
};

export type MemberWorkspaceSubscriptionChangeDTO = {
  changes: MemberWorkspaceSubscriptionChangeDTOOne[];
};

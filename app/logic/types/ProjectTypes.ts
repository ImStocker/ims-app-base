import type { LicenseFeatures } from './LicenseFeatures';
import type { AssetProps } from './Props';
import type { AssetPropWhere } from './PropsWhere';
import type { Workspace, WorkspaceQueryDTOWhere } from './Workspaces';

export enum ProjectRolePulseRights {
  VIEW = 'view',
  CREATE = 'create',
  MODERATE = 'moderate',
  ADMIN = 'admin',
}

export type ProjectIdWithTitle = {
  id: string;
  localId?: string;
  title: string;
};
export type ProjectShortInfo = {
  id: string;
  localId?: string;
  title: string;
  role: IProjectUserRole;
  isTemplate?: boolean;
  license: ProjectLicense | null;
  shortLink: string | null;
  parentsTree: ProjectIdWithTitle[];
};

export type ProjectLicense = {
  id: number;
  name: string;
  title: string;
  startAt: string | null;
  till: string | null;
  isTrial: boolean;
  features: LicenseFeatures;
};

export type ProjectSettings = {
  id: string;
  rights: number;
  values: {
    'menu-settings': {
      'menu-about': boolean | null;
      'menu-gamedesign': boolean | null;
      'menu-team': boolean | null;
    };
    'sync-settings': AssetProps;
    'export-formats': AssetProps;
  };
} | null;

export type ProjectFullInfo = {
  id: string;
  localPath?: string;
  title: string;
  lang: string;
  isPublicGdd: boolean;
  isPublicTasks: boolean;
  isPublicAbout: boolean;
  isPublicPulse: boolean;
  isPublicDiscussion: boolean;
  isUnsafeContent: boolean;
  isTemplate: boolean;
  license: ProjectLicense | null;
  createdAt: string;
  shortLink: string | null;
  settings: ProjectSettings;
  parentsTree: ProjectIdWithTitle[];
  rootWorkspaces: Workspace[];
  projectOwnerId?: number;
};
export type InvitationInfo = {
  projectId: string;
  projectTitle: string;
  email: string;
  code: string;
};
export type IProjectUserRole = {
  num: number;
  title: string;
  isAdmin: boolean;
  pulseRights: ProjectRolePulseRights;
};
export type IProjectUserOwnRole = IProjectUserRole & {
  rolesAssign: number[] | null;
};

export type ProjectMember = {
  id: number;
  name: string;
};

export type User = ProjectMember & {
  email: string;
};

export enum Lang {
  EN = 'en',
  RU = 'ru',
}

export type LangStr = 'en' | 'ru';

export type Member = User & {
  role: IProjectUserRole;
};

export type ProjectMeInfo = {
  id: number;
  name: string;
  email: string;
  shareContact: boolean;
  role: IProjectUserOwnRole | null;
};

export type SubscribersInfo = {
  total: number;
  isSubscribed: boolean;
};

export type AppLoadResult = {
  projects: ProjectShortInfo[];
  project: ProjectFullInfo | null;
  role: IProjectUserOwnRole | null;
  subscribers: SubscribersInfo | null;
  invitations: InvitationInfo[];
  unreadNotificationsCount: number;
  newsPopupId: number | null;
};

export type ApiResultList<T> = {
  list: T[];
};

export type ApiResultListWithTotal<T> = ApiResultList<T> & {
  total: number;
};

export type ApiResultListWithMore<T> = ApiResultList<T> & {
  more: boolean;
};

export type ApiRequestList<W> = {
  where?: W;
  count?: number;
  offset?: number;
  order?: any[];
};

export type ProjectInfoWithParams = {
  id: string;
  title: string;
  shortLink: string;
  lang: Lang;
  timezoneShift: number;
  isPublicGdd: boolean;
  isPublicTasks: boolean;
  isPublicAbout: boolean;
  isPublicPulse: boolean;
  parentsTree: ProjectIdWithTitle[];
  settings: ProjectSettings;
  isUnsafeContent: boolean;
  isTemplate: boolean;
  isUnsafeContentByModerator: Date;
  createdAt: Date;
  updatedAt: Date;
  rootWorkspaces: Workspace[];
};

export type ProjectParamsDTO = {
  title?: string;
  lang?: Lang;
  isPublicGdd?: boolean;
  isPublicTasks?: boolean;
  isPublicAbout?: boolean;
  isPublicPulse?: boolean;
  isUnsafeContent?: boolean;
  isTemplate?: boolean;
  timezoneShift?: number;
  shortLink?: string;
  projectOwnerId?: number | null;
};

export type ProjectStatsParameterDTO = {
  date: string;
  value: number;
};

export type ProjectStatsDTO = {
  views: ProjectStatsParameterDTO[];
  visitors: ProjectStatsParameterDTO[];
  subscribers: ProjectStatsParameterDTO[];
};

export type ProjectStatsByViewsAndVisitorsDTO = {
  views: ProjectStatsParameterDTO[];
  visitors: ProjectStatsParameterDTO[];
};

export type ProjectStatsBySubscribersDTO = {
  subscribers: ProjectStatsParameterDTO[];
};

export type ProjectImportResponseLogDTO = {
  level: 'warn' | 'error';
  text: string;
};

export type ProjectImportResponseDTO = {
  createdAssets: number;
  updatedAssets: number;
  createdWorkspaces: number;
  updatedWorkspaces: number;
  logs: ProjectImportResponseLogDTO[];
};

export type ExportProjectDTOWhere = {
  scope: string[];
};

export type ExportProjectParams = {
  save_structure?: boolean;
  use_names?: boolean;
};

export const DEFAULT_PROJECT_EXPORT_SETTINGS = {
  use_names: true,
  save_structure: true,
};

export type ChangesStreamRequest = {
  dateFrom: string;
  lastAssetId?: string | null;
  lastWorkspaceId?: string | null;
  whereAssets?: AssetPropWhere;
  whereWorkspaces?: WorkspaceQueryDTOWhere;
  count?: number;
};

export type ChangesStreamResponse = {
  assetUpdatedIds: string[];
  assetDeletedIds: string[];
  workspaceUpdatedIds: string[];
  workspaceDeletedIds: string[];
  more: boolean;
  last: {
    assetId: string | null;
    workspaceId: string | null;
    date: string;
  } | null;
};

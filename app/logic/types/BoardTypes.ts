import type {
  AssetPropValue,
  AssetPropValueAccount,
  AssetPropValueEnum,
  AssetPropValueFile,
  AssetPropValueTimestamp,
} from './Props';

// TODO: remove from this package
export type TaskEntity = {
  id: string;
  num: number;
  column: AssetPropValueEnum | null;
  workspaceId: string | null;
  title: string;
  name: string | null;
  completedAt: string | null;
  isAttracting: boolean;
  index: number | null;
  cover: AssetPropValueFile | null;
  assignedTo: {
    AccountId: string;
    Name: string;
  } | null;
  creatorUserId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  archivedAt?: string | null;
  color: string | null;
  scheduledAt: string | null;
  estimatedTime: number | null;
  estimatedSp: number | null;
  actualTime: number | null;
  category?: AssetPropValueEnum | null;
  timeLogs: TaskTimeLogRecord[];
  subTaskIds: string[];
  unread: number;
  planMilestone: AssetPropValueEnum | null;
};

export type TaskQueryDTOWhere = {
  [param: string]: any;
};

export type TaskTimeLogRecord = {
  taskId: string;
  taskNum: number;
  taskTitle: string;
  value: number;
  comment: AssetPropValue;
  date: AssetPropValueTimestamp;
  user: AssetPropValueAccount | null;
};

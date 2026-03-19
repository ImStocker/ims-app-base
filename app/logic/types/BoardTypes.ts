import type { AssetShort } from './AssetsType';
import type {
  AssetPropValue,
  AssetPropValueAccount,
  AssetPropValueEnum,
  AssetPropValueFile,
  AssetPropValueTimestamp,
} from './Props';

// TODO: remove from this package
export type TaskEntity = AssetShort & {
  num: number;
  column: AssetPropValueEnum | null;
  completedAt: string | null;
  isAttracting: boolean;
  cover: AssetPropValueFile | null;
  assignedTo: {
    AccountId: string;
    Name: string;
  } | null;
  archivedAt?: string | null;
  color: string | null;
  scheduledAt: string | null;
  estimatedTime: number | null;
  estimatedSp: number | null;
  actualTime: number | null;
  category?: AssetPropValueEnum | null;
  timeLogs: TaskTimeLogRecord[];
  subTaskIds: string[];
  planMilestone: AssetPropValueEnum | null;
};

export function convertTaskToAssetShort(task: TaskEntity): AssetShort {
  return {
    id: task.id,
    title: task.title,
    name: task.name,
    createdAt: task.createdAt,
    creatorUserId: task.creatorUserId,
    deletedAt: task.deletedAt,
    hasImage: task.hasImage,
    icon: task.icon,
    index: task.index,
    isAbstract: task.isAbstract,
    projectId: task.projectId,
    rights: task.rights,
    typeIds: task.typeIds,
    updatedAt: task.updatedAt,
    workspaceId: task.workspaceId,
    unread: task.unread,
  };
}

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

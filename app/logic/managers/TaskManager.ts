import { AppSubManagerBase } from './IAppManager';
import type { TaskEntity, TaskQueryDTOWhere } from '../types/BoardTypes';
import type { AssetPropValueAccount, AssetPropValueEnum } from '../types/Props';
import type { AssetSetDTO } from '../types/AssetsType';
import { TASK_COLUMN_ENUM } from '#logic/constants';

export type TaskMilestoneForm = {
  title: string;
  name: string;
  date: string | null;
  color: string | null;
  description: string | null;
};

export type TaskMilestone = TaskMilestoneForm & {
  value: AssetPropValueEnum;
  index: number;
};

export type TaskBoardColumn = {
  index: number | null;
  name: string;
  title: string;
  uneditable?: boolean;
};

export enum ChecklistTaskDeleteActions {
  DETACH = 'detachTask',
  DELETE = 'deleteTask',
  MOVE_TO_ARCHIVE = 'moveToArchive',
  MOVE_TO_BACKLOG = 'moveToBacklog',
}

export function convertTaskBoardColumnToAssetValueEnum(
  column: TaskBoardColumn,
): AssetPropValueEnum {
  return {
    Enum: TASK_COLUMN_ENUM,
    Name: column.name,
    Title: column.title,
  };
}
// TODO: remove from this package
export default abstract class TaskManager extends AppSubManagerBase {
  abstract getTaskViaCache(id: string): Promise<TaskEntity | null>;

  abstract getTaskViaCacheSync(id: string): TaskEntity | null | undefined;

  abstract requestTasksInCache(ids: string[]): Promise<void>;

  abstract requestTaskInCache(id: string): Promise<void>;

  abstract setTaskIsCompleted(id: string, val: boolean): Promise<void>;

  abstract setTasksAreCompleted(ids: string[], val: boolean): Promise<void>;

  abstract showCreateTaskDialog(
    options?: AssetSetDTO,
    post_created_hook?: (task: TaskEntity) => Promise<void>,
  ): Promise<TaskEntity | undefined>;

  async getTaskMilestones(): Promise<TaskMilestone[]> {
    return [];
  }

  abstract openTaskPreviewDialog(
    taskId: string,
    options: {
      deleteRef?: (silent?: boolean) => Promise<boolean> | boolean;
    },
  ): Promise<void>;

  abstract assignTasksTo(
    where: TaskQueryDTOWhere,
    account: AssetPropValueAccount | null,
  ): Promise<void>;

  abstract getBacklogWorkspaceId(): Promise<string | null>;

  abstract moveTasksToArchive(
    where: TaskQueryDTOWhere,
    setArchived?: boolean,
  ): Promise<void>;
  abstract getTaskBoardsWorkspaceId(): Promise<string | null>;

  abstract getFirstColumnOfBoard(
    board_id: string,
  ): Promise<TaskBoardColumn | null>;
}

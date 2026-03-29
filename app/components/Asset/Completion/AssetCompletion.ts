import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';
import { DialogSubContext } from '#logic/project-sub-contexts/DialogSubContext';
import TaskSubContext from '#logic/project-sub-contexts/TaskSubContext';
import type { IProjectContext } from '#logic/types/IProjectContext';
import { BLOCK_NAME_META, TASK_ASSET_ID } from '../../../logic/constants';
import type { AssetFullInstanceR } from '../../../logic/types/AssetFullInstance';
import type {
  AssetPropsParamsDTO,
  AssetSetDTO,
} from '../../../logic/types/AssetsType';
import type { TaskEntity } from '../../../logic/types/BoardTypes';
import {
  castAssetPropValueToFloat,
  convertAssetPropsToPlainObject,
  type AssetProps,
  type AssetPropValueAsset,
  type AssetPropValueEnum,
} from '../../../logic/types/Props';
import { assert } from '../../../logic/utils/typeUtils';
import ConfirmDialog from '../../Common/ConfirmDialog.vue';

export type AssetCompletionMeta = {
  completeTrack: boolean;
  completeSet: boolean | null;
  completeProgress: number | null;
  planMilestone: null | AssetPropValueEnum;
};

export function readAssetMetaCompletionBlockProps(
  props: AssetProps,
): AssetCompletionMeta {
  return {
    completeTrack: props.complete_track ? !!props.complete_track : false,
    completeProgress:
      props.complete_progress !== null && props.complete_progress !== undefined
        ? castAssetPropValueToFloat(props.complete_progress)
        : null,
    planMilestone: props.plan_milestone as AssetPropValueEnum,
    completeSet: props.complete_set !== null ? !!props.complete_set : null,
  };
}

async function requestAllChecklistTasksInCache(
  projectContext: IProjectContext,
  assetFulls: AssetFullInstanceR[],
) {
  const task_ids: string[] = [];
  for (const asset_full of assetFulls) {
    for (const block of asset_full.blocks) {
      if (block.type === 'checklist') {
        const checklist_entries = Object.values(
          convertAssetPropsToPlainObject(block.computed),
        ) as { checked: boolean; task: AssetPropValueAsset | null }[];
        for (const checklist_item of checklist_entries) {
          if (checklist_item.task) {
            if (checklist_item.task.AssetId) {
              task_ids.push(checklist_item.task.AssetId);
            }
          }
        }
      }
    }
  }
  await projectContext.get(TaskSubContext).requestTasksInCache(task_ids);
}

export function getCompletionDisplay(
  info: AssetCompletionMeta,
  dirty_complete_set?: boolean,
): {
  done: boolean;
  percent: number | null;
} {
  let done: boolean;
  if (dirty_complete_set !== undefined) {
    done = dirty_complete_set;
  } else {
    if (info.completeSet !== null) {
      done = !!info.completeSet;
    } else {
      done = (info.completeProgress ?? 0) >= 1;
    }
  }
  return {
    done,
    percent:
      info.completeProgress !== null
        ? Math.max(
            Math.min(Math.floor(info.completeProgress * 100), done ? 100 : 99),
            0,
          )
        : null,
  };
}

export async function setAssetCompleted(
  projectContext: IProjectContext,
  assetId: string,
  val: boolean,
) {
  const asset_full = await projectContext
    .get(AssetSubContext)
    .getAssetInstance(assetId);
  if (!asset_full) return;

  const info = asset_full.convertToPreviewInfo();

  let complete_progress = info.completeProgress;
  const asset_set: AssetSetDTO = {
    blocks: {},
  };
  assert(asset_set.blocks);

  if (val && info.completeProgress !== null && info.completeProgress < 1) {
    const res = await projectContext.get(DialogSubContext).show(ConfirmDialog, {
      withCancel: true,
      header: projectContext.appManager.$t(
        'asset.completion.markAsCompletedConfirmHeader',
      ),
      message: projectContext.appManager.$t(
        'asset.completion.markAsCompletedConfirmMessage',
      ),
    });
    if (res === null) return;
    if (res) {
      await requestAllChecklistTasksInCache(projectContext, [asset_full]);

      const ref_assets = await Promise.all(
        asset_full.references.map((ref) => {
          return projectContext
            .get(AssetSubContext)
            .getAssetShortViaCache(ref.targetAssetId);
        }),
      );
      const ref_not_completed_tasks: TaskEntity[] = (
        await Promise.all(
          ref_assets
            .filter((ref_asset) => {
              return ref_asset?.typeIds.includes(TASK_ASSET_ID);
            })
            .map((ref_asset) => {
              return ref_asset
                ? projectContext
                    .get(TaskSubContext)
                    .getTaskViaCache(ref_asset.id)
                : null;
            }),
        )
      ).filter((ref_task) => ref_task && !ref_task.completedAt) as TaskEntity[];

      const mark_tasks_done: string[] = ref_not_completed_tasks.map(
        (task) => task.id,
      );
      for (const block of asset_full.blocks) {
        if (block.type === 'checklist') {
          const checklist_entries = Object.entries(
            convertAssetPropsToPlainObject(block.computed),
          ) as [
            string,
            { checked: boolean; task: AssetPropValueAsset | null },
          ][];
          for (const [checklist_key, checklist_item] of checklist_entries) {
            let set_item_checked = true;
            if (checklist_item.task) {
              if (checklist_item.task.AssetId) {
                const task = await projectContext
                  .get(TaskSubContext)
                  .getTaskViaCache(checklist_item.task.AssetId);
                if (task) {
                  set_item_checked = false;
                  if (!task.completedAt) {
                    mark_tasks_done.push(task.id);
                  }
                }
              }
            }
            if (set_item_checked) {
              let block_set = asset_set.blocks[`@${block.id}`];
              if (!block_set) {
                block_set = {
                  props: {},
                };
                asset_set.blocks[`@${block.id}`] = block_set;
              }
              assert(block_set.props);
              (block_set.props as AssetPropsParamsDTO)[
                `${checklist_key}\\checked`
              ] = true;
              (block_set.props as AssetPropsParamsDTO)[
                `${checklist_key}\\task`
              ] = null;
            }
          }
        }
      }
      complete_progress = 1;
      await projectContext
        .get(TaskSubContext)
        .setTasksAreCompleted(mark_tasks_done, true);
    }
  }
  if (val) {
    asset_set.blocks[BLOCK_NAME_META] = {
      props: {
        complete_set:
          complete_progress !== null && complete_progress >= 1 ? null : true,
      },
    };
  } else {
    asset_set.blocks[BLOCK_NAME_META] = {
      props: {
        complete_set:
          complete_progress !== null && complete_progress >= 1 ? false : null,
      },
    };
  }

  await projectContext.get(AssetSubContext).changeAssets({
    where: {
      id: assetId,
    },
    set: asset_set,
  });
}

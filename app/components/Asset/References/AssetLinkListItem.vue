<template>
  <div v-if="!(isTask && targetAsTask?.archivedAt)">
    <div v-if="loadingError" class="AssetLinkListItem-error">
      {{ loadingError }}
    </div>
    <template v-else>
      <div v-if="saving" class="loaderBar loaderBar-saving"></div>
      <div class="AssetLinkListItem-asset">
        <div v-if="isLoading" class="loaderSpinner AssetLinkListItem-loading" />
        <slot v-else name="checkbox" :is-completed="completedAt">
          <i
            v-if="isTask"
            class="AssetLinkListItem-asset-status"
            :class="[
              completedAt ? 'ri-checkbox-line' : 'ri-checkbox-blank-line',
            ]"
            :disabled="isGuest ? true : undefined"
            @click.stop="check(!completedAt)"
          ></i>
          <i
            v-else
            :class="[
              'state-edit',
              'asset-icon-' +
                (targetAsset && targetAsset?.icon
                  ? targetAsset.icon
                  : 'file-fill'),
              'AssetLinkListItem-asset-icon',
            ]"
          ></i>
        </slot>
        <div class="AssetLinkListItem-asset-content">
          <slot
            name="subtask"
            :asset-link-to="assetLinkTo"
            :title="targetAsset?.title"
          >
            <div
              class="AssetLinkListItem-asset-content-title"
              :class="[isTask ? '' : 'state-edit']"
            >
              <span
                class="AssetLinkListItem-asset-content-title-link"
                @click="openAsset($event)"
              >
                {{ targetAsset?.title ?? '' }}
              </span>
            </div>
          </slot>
          <div v-if="isTask" class="AssetLinkListItem-description-items">
            <div
              v-if="targetAsTask?.assignedTo"
              class="AssetLinkListItem-description-item"
            >
              <i class="fa fa-user"></i>
              {{ targetAsTask.assignedTo.Name }}
            </div>
            <!-- <div v-else class="AssetLinkListItem-description-item AssetLinkListItem-description-item-error">
                <i class="ri-error-warning-fill"></i>
                {{ task?.assignedTo }}
            </div> -->
            <project-link
              v-if="!isGuest && projectInfo"
              :project="projectInfo"
              :to="assetLinkTo"
              target="_blank"
              :title="$t('translatedTitles.Task')"
              class="AssetLinkListItem-asset-content-task-title"
              :class="{
                'state-done': completedAt,
              }"
              @click.prevent="openAsset"
            >
              <i class="ri-link AssetLinkListItem-asset-content-icon"></i>
              {{ $t('translatedTitles.Task') }}
            </project-link>
            <div
              v-if="taskColor !== 'transparent'"
              :style="{ '--task-color': taskColor }"
              class="AssetLinkListItem-asset-content-task-color"
            ></div>
          </div>
          <div v-else class="AssetLinkListItem-asset-content-asset">
            <div v-if="!isGuest">
              <menu-button>
                <menu-list :menu-list="menuList"></menu-list>
              </menu-button>
            </div>
          </div>
        </div></div
    ></template>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type {
  AssetReferenceCommonEntity,
  AssetShort,
} from '../../../logic/types/AssetsType';
import CreatorAssetManager from '../../../logic/managers/CreatorAssetManager';
import TaskManager from '../../../logic/managers/TaskManager';
import UiManager from '../../../logic/managers/UiManager';
import DialogManager from '../../../logic/managers/DialogManager';
import AssetPreviewDialog from '../AssetPreviewDialog.vue';
import { getTaskColorValue } from '../../../logic/utils/tasks';
import ProjectManager from '../../../logic/managers/ProjectManager';
import { openProjectLink } from '../../../logic/router/routes-helpers';
import ProjectLink from '../../Common/ProjectLink.vue';
import MenuButton from '../../Common/MenuButton.vue';
import MenuList from '../../Common/MenuList.vue';
import type { AssetBlockEditorVM } from '../../../logic/vm/AssetBlockEditorVM';
import { assert } from '../../../logic/utils/typeUtils';
import { TASK_ASSET_ID } from '../../../logic/constants';

export default defineComponent({
  name: 'AssetLinkListItem',
  components: {
    ProjectLink,
    MenuButton,
    MenuList,
  },
  props: {
    asset: {
      type: Object as PropType<AssetShort>,
      default: null,
    },
    combinedReference: {
      type: Object as PropType<AssetReferenceCommonEntity>,
      default: null,
    },
    assetBlockEditor: {
      type: Object as PropType<AssetBlockEditorVM>,
      required: true,
    },
    isBacklinks: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      isLoading: false,
      loadingError: null as null | string,
      saving: false,
      setCompletedAt: undefined as undefined | boolean,
    };
  },
  computed: {
    completedAt() {
      if (this.setCompletedAt !== undefined) return this.setCompletedAt;
      return !!this.targetAsTask?.completedAt;
    },
    targetAssetId() {
      if (this.combinedReference) {
        return this.combinedReference.targetAssetId;
      }
      return this.asset?.id;
    },
    menuList() {
      return this.combinedReference
        ? [
            {
              title: this.$t('assetEditor.blockMenu.deleteLink'),
              icon: 'delete',
              danger: true,
              action: () => this.deleteLink(),
            },
          ]
        : [];
    },
    isTask() {
      if (!this.targetAsset) return false;
      return this.targetAsset.typeIds.includes(TASK_ASSET_ID);
    },
    targetAsset() {
      return this.$getAppManager()
        .get(CreatorAssetManager)
        .getAssetShortViaCacheSync(this.targetAssetId);
    },
    targetAsTask() {
      if (!this.isTask) return null;
      return this.$getAppManager()
        .get(TaskManager)
        .getTaskViaCacheSync(this.targetAssetId);
    },
    taskColor() {
      if (!this.targetAsTask) return 'transparent';
      return getTaskColorValue(this.targetAsTask.color);
    },
    isGuest() {
      return !this.$getAppManager().get(ProjectManager).getUserRoleInProject();
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    assetLinkTo() {
      if (this.targetAsTask?.num) {
        return {
          name: 'project-tasks-task',
          params: {
            taskNum: this.targetAsTask.num,
          },
        };
      } else {
        return {
          name: 'project-asset-by-id',
          params: {
            assetId: this.targetAssetId,
          },
        };
      }
    },
  },
  watch: {
    asset() {
      this.reload();
    },
    combinedReference() {
      this.reload();
    },
  },
  created() {
    this.isLoading = this.isTask;
  },
  async mounted() {
    await this.reload();
  },
  methods: {
    async reload() {
      this.isLoading = true;
      try {
        await this.$getAppManager()
          .get(CreatorAssetManager)
          .requestAssetShortInCache(this.targetAssetId);
        if (this.isTask) {
          await this.$getAppManager()
            .get(TaskManager)
            .requestTaskInCache(this.targetAssetId);
        }
      } catch (err: any) {
        this.loadingError = err.message;
      } finally {
        this.isLoading = false;
      }
    },
    async check(val: boolean) {
      if (this.isGuest) {
        return;
      }
      this.setCompletedAt = val;
      this.saving = true;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.$getAppManager()
            .get(TaskManager)
            .setTaskIsCompleted(this.targetAssetId, val);
        });
      this.setCompletedAt = undefined;
      this.saving = false;
    },
    async openAsset(e: MouseEvent) {
      if (!this.projectInfo) return;

      if (e.ctrlKey || e.metaKey) {
        openProjectLink(
          this.$getAppManager(),
          this.projectInfo,
          this.assetLinkTo,
          true,
        );
      } else {
        if (this.isTask) {
          await this.$getAppManager()
            .get(TaskManager)
            .openTaskPreviewDialog(this.targetAssetId, {
              deleteRef: (silent?: boolean) => this.deleteLink(silent),
            });
        } else {
          await this.$getAppManager()
            .get(DialogManager)
            .create(AssetPreviewDialog, {
              assetId: this.targetAssetId,
              deleteRef: (silent?: boolean) => this.deleteLink(silent),
            })
            .open();
        }
      }
    },
    async deleteLink(silent?: boolean): Promise<boolean> {
      assert(this.combinedReference);

      let block_id = this.combinedReference.sourceBlockId;
      let source_asset_id = this.assetBlockEditor.assetFull?.id ?? '';
      let target_asset_id = this.targetAssetId;
      let target_block_id = this.combinedReference.targetBlockId;
      if (this.isBacklinks) {
        block_id = this.combinedReference.targetBlockId;
        source_asset_id = this.targetAssetId;
        target_asset_id = this.assetBlockEditor.assetFull?.id ?? '';
        target_block_id = this.combinedReference.sourceBlockId;
      }
      return await this.assetBlockEditor.deleteRef(
        {
          sourceAssetId: source_asset_id,
          sourceBlockId: block_id,
          targetAssetId: target_asset_id,
          targetBlockId: target_block_id,
        },
        silent,
      );
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/asset-icons';

.AssetLinkListItem {
  display: flex;
  align-items: center;
  position: relative;
  border-radius: 4px;
  border: 1px solid transparent;

  .state-edit {
    color: var(--local-link-color);
  }

  .state-ready {
    color: var(--color-ready-value);
  }
}
.AssetLinkListItem:hover {
  background-color: var(--local-hl-bg-color);
}

.AssetLinkListItem-asset-status {
  font-size: 24px;
  margin-right: 9px;
  cursor: pointer;
  color: #ccc;

  &:hover {
    color: var(--color-ready-value);
  }

  &.ri-checkbox-line {
    color: var(--color-ready-value);

    &:hover {
      color: #ccc;
    }
  }
}

.AssetLinkListItem-asset {
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 4px 15px 4px 9px;
  display: flex;
  align-items: center;
  width: 100%;
}

.AssetLinkListItem-asset-content-task,
AssetLinkListItem-asset-content-asset,
.AssetLinkListItem-asset-content {
  display: flex;
  align-items: center;
}

.AssetLinkListItem-asset-content {
  width: 100%;
  justify-content: space-between;
  font-size: var(--local-font-size);
}

.AssetLinkListItem-asset-content-title {
  width: 100%;
}

.AssetLinkListItem-asset-content-title-link {
  cursor: pointer;
}

.AssetLinkListItem-asset-content-task-title {
  color: var(--local-link-color);
  cursor: pointer;
  text-decoration: none;
  display: flex;
  align-items: center;

  &.state-done {
    color: var(--color-ready-value);
  }
}

.AssetLinkListItem-asset-content-icon {
  font-size: 16px;
  margin-right: 5px;
}

.AssetLinkListItem-asset-icon {
  font-size: 16px;
  margin-right: 9px;
  font-size: 20px;
  font-style: normal;
  @include asset-icons.asset-icons;
}

.AssetLinkListItem-description-items {
  display: flex;
  gap: 15px;
  align-items: center;
}

.AssetLinkListItem-description-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.AssetLinkListItem-description-item-error {
  color: var(--color-main-error);
}

.AssetLinkListItem-asset-content-asset-status {
  font-size: 20px;
  color: #ccc;

  .ri-checkbox-circle-line {
    color: var(--color-ready-value);
  }
}

.AssetLinkListItem-asset-content-asset {
  display: flex;
  align-items: center;
}

.AssetLinkListItem-asset-content-task-color {
  margin-left: -10px;
  width: 2px;
  height: 20px;
  background: var(--task-color);
}

.AssetLinkListItem-error {
  color: var(--color-main-error);
}

.AssetLinkListItem-loading {
  margin-right: 9px;
}
</style>

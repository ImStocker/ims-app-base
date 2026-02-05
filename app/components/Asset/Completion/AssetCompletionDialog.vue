<template>
  <dialog-content class="AssetCompletionDialog" :loading="!loadingDone">
    <div class="Dialog-header">
      {{ $t('asset.completion.assetCompletionDialogHeader') }}
    </div>
    <div v-if="loadingError" class="error-message-block">
      {{ loadingError }}
    </div>
    <template v-else-if="asset">
      <div class="AssetCompletionDialog-body">
        <div class="AssetCompletionDialog-params">
          <div
            class="AssetCompletionDialog-params-one AssetCompletionDialog-complete is-button is-button-icon"
            :class="{ disabled: !canEdit }"
            @click="setComplete(!completion.done)"
          >
            <task-checkbox
              :model-value="completion.done"
              :loading="dirtyCompleteSet !== undefined"
              :disabled="!canEdit"
              @update:model-value="setComplete($event)"
              @click.stop
            ></task-checkbox>
            <span
              v-if="!completion.done"
              class="AssetCompletionDialog-complete-notCompleted"
            >
              <template v-if="completion.percent === null">
                {{ $t('asset.completion.progressNotCompleted') }}
              </template>
              <template v-else>
                {{ $t('asset.completion.progressCompletion') }}:
                {{ completion.percent }}%
              </template>
            </span>
            <span v-else class="AssetCompletionDialog-complete-completed">
              {{ $t('asset.completion.progressCompleted') }}
            </span>
          </div>
          <div
            v-if="!isDesktop"
            class="AssetCompletionDialog-params-one AssetCompletionDialog-milestone"
          >
            <div class="AssetCompletionDialog-milestone-capiton">
              {{ $t('asset.completion.milestone') }}:
            </div>
            <div class="AssetCompletionDialog-milestone-select">
              <menu-button class="TaskParamCategory">
                <template #button="{ toggle }">
                  <button
                    class="is-button"
                    :class="{
                      loading: milestoneSaving,
                      accent: !!info?.planMilestone,
                    }"
                    :disabled="
                      milestoneSaving ||
                      (milestonesMenu.length === 0 && !info?.planMilestone) ||
                      !canEdit
                    "
                    :title="milestoneInfoSelected?.description ?? ''"
                    @click="toggle"
                  >
                    <template v-if="info?.planMilestone">
                      <caption-string
                        :value="info.planMilestone.Title"
                      ></caption-string>
                    </template>
                    <template v-else-if="milestonesMenu.length > 0">
                      {{ $t('asset.completion.milestoneSelect') }}
                    </template>
                    <template v-else>
                      {{ $t('asset.completion.milestoneNoOptions') }}
                    </template>
                  </button>
                </template>
                <menu-list :menu-list="milestonesMenu"></menu-list>
              </menu-button>
            </div>
            <div
              v-if="canEditMilestones && projectInfo"
              class="AssetCompletionDialog-milestone-configure"
              :title="$t('asset.completion.milestoneConfigure')"
            >
              <project-link
                class="is-button is-button-icon"
                target="_blank"
                :project="projectInfo"
                :to="{
                  name: 'project-tasks-planning',
                }"
              >
                <i class="ri-settings-3-fill"></i>
              </project-link>
            </div>
            <div v-if="canEdit" class="AssetCompletionDialog-milestone-help">
              <FormBuilderFieldTooltip
                :message="$t('asset.completion.milestoneHelp')"
              />
            </div>
          </div>
        </div>
        <div
          v-if="asset && (canEdit || !showAddChecklistButton)"
          class="AssetCompletionDialog-todo"
        >
          <asset-block-editor-root :asset-full="asset">
            <template #default="{ assetBlockEditor }">
              <div class="AssetCompletionDialog-todo-content">
                <button
                  v-if="showAddChecklistButton"
                  class="is-button is-button-dotted AssetCompletionDialog-addChecklist"
                  :disabled="checklistCreating"
                  :class="{
                    loading: checklistCreating,
                  }"
                  @click="addChecklist"
                >
                  <i class="ri-add-box-fill"></i>
                  {{ $t('asset.completion.addTodoList') }}
                </button>
                <asset-block-editor
                  v-else
                  class="AssetCompletionDialog-blockEditor"
                  :allow-add-blocks="false"
                  display-mode="page"
                  :asset-block-editor="assetBlockEditor"
                  :filter-blocks="(block) => block.type === 'checklist'"
                  :hide-root-links="true"
                  :hide-block-links="true"
                  @update:is-dirty="isDirty = $event"
                />
                <asset-reference-list
                  v-if="taskReferences.length > 0"
                  class="AssetCompletionDialog-references-content"
                  :combined-references="taskReferences"
                  :asset-block-editor="assetBlockEditor"
                ></asset-reference-list>
              </div>
            </template>
          </asset-block-editor-root>
        </div>
      </div>
      <div class="Form-row-buttons">
        <div
          class="Form-row-buttons-center AssetSettingsDialog-buttons use-buttons-action"
        >
          <button class="is-button" @click="close()">
            {{ $t('common.dialogs.close') }}
          </button>
        </div>
      </div>
    </template>
  </dialog-content>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../../Dialog/DialogContent.vue';
import CreatorAssetManager from '../../../logic/managers/CreatorAssetManager';
import UiManager from '../../../logic/managers/UiManager';
import type { DialogInterface } from '../../../logic/managers/DialogManager';
import type { AssetFullInstanceR } from '../../../logic/types/AssetFullInstance';
import type {
  AssetPreviewInfo,
  AssetReferenceEntity,
} from '../../../logic/types/AssetsType';
import { getCompletionDisplay, setAssetCompleted } from './AssetCompletion';
import TaskCheckbox from '../../Common/TaskCheckbox.vue';
import FormBuilderFieldTooltip from '../../Form/FormBuilderFieldTooltip.vue';
import type { TaskMilestone } from '../../../logic/managers/TaskManager';
import TaskManager from '../../../logic/managers/TaskManager';
import MenuButton from '../../Common/MenuButton.vue';
import MenuList from '../../Common/MenuList.vue';
import type { MenuListItem } from '../../../logic/types/MenuList';
import { convertTranslatedTitle } from '../../../logic/utils/assets';
import ProjectManager from '../../../logic/managers/ProjectManager';
import CaptionString from '../../Common/CaptionString.vue';
import { BLOCK_NAME_META, TASK_ASSET_ID } from '../../../logic/constants';
import { AssetRights } from '../../../logic/types/Rights';
import ProjectLink from '../../Common/ProjectLink.vue';
import AssetBlockEditorRoot from '../Editor/AssetBlockEditorRoot.vue';
import AssetBlockEditor from '../Editor/AssetBlockEditor.vue';
import { v4 as uuidv4 } from 'uuid';
import { getNextIndexWithTimestamp } from '../Editor/blockUtils';
import AssetReferenceList from '../References/AssetReferenceList.vue';

type DialogProps = {
  assetId: string;
};

type DialogResult = boolean | undefined;

export default defineComponent({
  name: 'AssetCompletionDialog',
  components: {
    DialogContent,
    TaskCheckbox,
    FormBuilderFieldTooltip,
    MenuButton,
    MenuList,
    CaptionString,
    ProjectLink,
    AssetBlockEditorRoot,
    AssetBlockEditor,
    AssetReferenceList,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  data() {
    return {
      loadingError: null as string | null,
      loadingDone: false,
      dirtyCompleteSet: undefined as boolean | undefined,
      taskMilestones: [] as TaskMilestone[],
      milestoneSaving: false,
      isDirty: false,
      checklistCreating: false,
    };
  },
  computed: {
    isDesktop() {
      return this.$getAppManager().$appConfiguration.isDesktop;
    },
    canEdit() {
      return (this.info?.rights ?? AssetRights.NO) >= AssetRights.FILL_EMPTY;
    },
    info(): AssetPreviewInfo | null | undefined {
      const info = this.$getAppManager()
        .get(CreatorAssetManager)
        .getAssetPreviewViaCacheSync(this.dialog.state.assetId);
      if (info === undefined) {
        this.$getAppManager()
          .get(CreatorAssetManager)
          .requestAssetPreviewInCache(this.dialog.state.assetId);
      }
      return info;
    },
    asset(): AssetFullInstanceR | null | undefined {
      return this.$getAppManager()
        .get(CreatorAssetManager)
        .getAssetInstanceViaCacheSync(this.dialog.state.assetId);
    },
    completion() {
      if (!this.info) return { done: false, percent: null };
      return getCompletionDisplay(this.info, this.dirtyCompleteSet);
    },
    canEditMilestones() {
      return !!this.$getAppManager().get(ProjectManager).getUserRoleInProject()
        ?.isAdmin;
    },
    milestoneInfoSelected() {
      if (this.info?.planMilestone) {
        return (
          this.taskMilestones.find(
            (m) => m.name === this.info?.planMilestone?.Name,
          ) ?? null
        );
      }
      return null;
    },
    milestonesMenu(): MenuListItem[] {
      const options: MenuListItem[] = this.taskMilestones.map((m) => {
        return {
          title: convertTranslatedTitle(m.title, (...args) => this.$t(...args)),
          tooltip: m.description ?? undefined,
          action: async () => {
            await this.setMilestone(m);
          },
        };
      });
      if (this.info?.planMilestone) {
        options.push({
          title: this.$t('asset.completion.milestoneNotSet'),
          danger: true,
          action: async () => {
            await this.setMilestone(null);
          },
        });
      }
      return options;
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    showAddChecklistButton() {
      if (!this.asset) return false;
      const any_checklist = this.asset.blocks.find(
        (b) => b.type === 'checklist',
      );
      return !any_checklist;
    },
    taskReferences(): AssetReferenceEntity[] {
      const references: AssetReferenceEntity[] = [];
      if (this.asset) {
        for (const reference of this.asset.references) {
          const ref_asset = this.$getAppManager()
            .get(CreatorAssetManager)
            .getAssetShortViaCacheSync(reference.targetAssetId);
          if (ref_asset && ref_asset.typeIds.includes(TASK_ASSET_ID)) {
            references.push(reference);
          }
        }
      }
      return references;
    },
  },
  watch: {
    isDirty() {
      this.$emit('dialog-parameters', {
        forbidClose: this.isDirty,
      });
    },
  },
  async mounted() {
    await this.load();
  },
  methods: {
    async addChecklist() {
      if (this.checklistCreating) {
        return;
      }
      if (!this.asset) {
        return;
      }
      this.checklistCreating = true;
      const max_index =
        this.asset.blocks.length > 0
          ? this.asset.blocks.reduce((acc, b) => {
              return Math.max(acc, b.index);
            }, this.asset.blocks[0].index)
          : 0;
      const new_block_id = uuidv4();
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.$getAppManager()
            .get(CreatorAssetManager)
            .changeAssets({
              where: {
                id: this.dialog.state.assetId,
              },
              set: {
                blocks: {
                  [`@${new_block_id}`]: {
                    type: 'checklist',
                    title: this.$t('asset.completion.todoListTitle'),
                    index: getNextIndexWithTimestamp(max_index),
                  },
                },
              },
            });
        });

      this.checklistCreating = false;
    },
    async setMilestone(milestone: TaskMilestone | null) {
      if (this.milestoneSaving) {
        return;
      }
      this.milestoneSaving = true;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.$getAppManager()
            .get(CreatorAssetManager)
            .changeAssets({
              where: {
                id: this.dialog.state.assetId,
              },
              set: {
                blocks: {
                  [BLOCK_NAME_META]: {
                    props: {
                      plan_milestone: milestone ? milestone.value : null,
                    },
                  },
                },
              },
            });
        });
      this.milestoneSaving = false;
    },
    async load() {
      this.loadingError = null;
      this.loadingDone = false;
      try {
        await this.$getAppManager()
          .get(CreatorAssetManager)
          .requestAssetInstanceInCache(this.dialog.state.assetId);
        this.taskMilestones = await this.$getAppManager()
          .get(TaskManager)
          .getTaskMilestones();
      } catch (err: any) {
        this.loadingError = err.message;
      } finally {
        this.loadingDone = true;
      }
    },
    async setComplete(val: boolean) {
      if (!this.canEdit) return;
      if (!this.info) return;
      this.dirtyCompleteSet = val;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await setAssetCompleted(
            this.$getAppManager(),
            this.dialog.state.assetId,
            val,
          );
        });
      if (val === this.dirtyCompleteSet) {
        this.dirtyCompleteSet = undefined;
      }
    },
    close() {
      this.dialog.close();
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins.scss';

.AssetCompletionDialog {
  width: 800px;
}

.AssetCompletionDialog-body {
  margin-bottom: 20px;
}

.AssetCompletionDialog-params {
  display: flex;
  justify-content: space-between;
}

.AssetCompletionDialog-complete-notCompleted {
  color: var(--local-sub-text-color);
}
.AssetCompletionDialog-complete-completed {
  color: var(--color-ready-value);
}
.AssetCompletionDialog-complete {
  white-space: nowrap;
}
.AssetCompletionDialog-params {
  margin-bottom: 20px;
}
.AssetCompletionDialog-milestone {
  display: flex;
  align-items: center;
  gap: 5px;
}
.AssetCompletionDialog-addChecklist {
  width: 100%;
  justify-content: center;
  padding: 0.8em 0.66em;
}
.AssetCompletionDialog-todo-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>

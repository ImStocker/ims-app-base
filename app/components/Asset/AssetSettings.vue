<template>
  <menu-button v-if="menuList.length > 0">
    <menu-list :menu-list="menuList"></menu-list>
  </menu-button>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import type { AssetFullEditorVM } from '../../logic/vm/AssetFullEditorVM';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import TaskManager from '../../logic/managers/TaskManager';
import { convertTranslatedTitle } from '../../logic/utils/assets';
import DialogManager from '../../logic/managers/DialogManager';
import PromptDialog from '../Common/PromptDialog.vue';
import UiManager from '../../logic/managers/UiManager';
import { MIN_ASSET_RIGHTS_TO_HISTORY } from '../../logic/types/Rights';
import AssetHistoryDialog from './History/AssetHistoryDialog.vue';
import { assert } from '../../logic/utils/typeUtils';
import ProjectManager from '../../logic/managers/ProjectManager';
import {
  getProjectLinkHref,
  openProjectLink,
} from '../../logic/router/routes-helpers';
import FastCreateAssetDialog from './FastCreateAssetDialog.vue';
import type { MenuListItem } from '../../logic/types/MenuList';
import MenuButton from '../Common/MenuButton.vue';
import MenuList from '../Common/MenuList.vue';
import { ARTICLE_ASSET_ID, DISCUSSION_ASSET_ID } from '../../logic/constants';
import { clipboardCopyPlainText } from '../../logic/utils/clipboard';
import SetUpAccessDialog from './Rights/SetUpAccessDialog.vue';
import type { AssetPropValueAccount } from '../../logic/types/Props';
import { castAssetPropValueToAccount } from '../../logic/types/Props';
import ProjectContentManager from '../../logic/managers/ProjectContentManager';

export default defineComponent({
  name: 'AssetSettings',
  components: {
    MenuButton,
    MenuList,
  },
  props: {
    assetEditor: {
      type: Object as PropType<AssetFullEditorVM>,
      required: true,
    },
  },
  emits: ['delete'],
  computed: {
    isAdmin() {
      return this.$getAppManager().get(ProjectManager).isAdmin();
    },
    isGuest() {
      return !this.$getAppManager().get(ProjectManager).getUserRoleInProject();
    },
    canCreateTask() {
      return this.$getAppManager().get(ProjectManager).canCreateTask();
    },
    isSystemAsset() {
      return this.currentAssetFull
        ? this.currentAssetFull.projectId !== this.projectInfo?.id
        : false;
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    isDesktop() {
      return this.$getAppManager().$appConfiguration.isDesktop;
    },
    menuList() {
      const list: any[] = [];
      if (!this.isDiscussion && !this.isArticle) {
        list.push(
          this.currentSingleAsset && this.currentSingleAsset.name
            ? {
                title: this.currentSingleAsset.name,
                icon: 'serviceName',
              }
            : null,
          this.allAreAbstract
            ? {
                title: this.$t('gddPage.abstract'),
              }
            : null,
          {
            type: 'separator',
          },
        );
      }
      list.push(
        !this.isArticle && !this.isGuest && !this.isSystemAsset
          ? {
              title: this.$t('common.dialogs.rename'),
              icon: 'edit',
              action: this.renameAsset,
            }
          : null,
        !this.isGuest &&
          !this.isDiscussion &&
          !this.isArticle &&
          !this.isSystemAsset
          ? {
              title: this.$t('gddPage.settings'),
              icon: 'settings',
              action: this.openSettingsDialog,
            }
          : null,
        this.isAdmin &&
          !this.isDiscussion &&
          !this.isArticle &&
          !this.isGuest &&
          !this.isSystemAsset &&
          !this.isDesktop
          ? {
              title: this.$t('gddPage.setUpAccess'),
              icon: 'ri-lock-fill',
              action: this.openSetUpAccessDialog,
            }
          : null,
        !this.isDiscussion && !this.isArticle && !this.isGuest
          ? {
              title: this.$t('gddPage.showLinks'),
              icon: 'links',
              action: this.openLinksDialog,
            }
          : null,
        !this.isArticle && !this.isGuest && !this.isDiscussion
          ? {
              title: this.$t('asset.createInstance'),
              action: this.createInstance,
              icon: 'fileCreate',
            }
          : null,
        !this.isDiscussion &&
          !this.isArticle &&
          this.canCreateTask &&
          !this.isSystemAsset
          ? {
              title: this.$t('boardPage.tasks.' + 'createTask'),
              action: this.createTask,
              icon: 'task',
            }
          : null,
        !this.isArticle &&
          !this.isGuest &&
          !this.isDiscussion &&
          !this.isSystemAsset &&
          !this.isDesktop
          ? {
              title: this.$t('gddPage.createRef'),
              action: this.createRef,
              icon: 'link',
            }
          : null,
        this.historyShown && !this.isDiscussion && !this.isDesktop
          ? {
              title: this.$t('gddPage.history'),
              icon: 'history',
              action: this.showHistory,
            }
          : null,
        !this.isDiscussion
          ? {
              title: this.$t('gddPage.export'),
              icon: 'export',
              children: [
                {
                  title: this.$t('gddPage.exportToMD'),
                  action: () => this.exportToDocumentAsset('md'),
                },
                {
                  title: this.$t('gddPage.exportToPDF'),
                  action: () => this.exportToDocumentAsset('pdf'),
                },
                {
                  title: this.$t('gddPage.exportToJSON'),
                  action: () => this.exportToJSONAsset(),
                },
                {
                  title: this.$t('gddPage.exportWithCustomFormat'),
                  action: () => this.exportWithCustomFormat(),
                },
              ],
            }
          : null,
        this.currentSingleAsset && !this.isGuest && !this.isSystemAsset
          ? {
              title: this.$t('gddPage.delete'),
              action: () => this.$emit('delete', this.currentSingleAsset),
              danger: true,
              icon: 'delete',
            }
          : null,
      );
      return list.filter((x) => x) as MenuListItem[];
    },
    historyShown() {
      if (!this.currentSingleAsset) return false;
      return this.currentSingleAsset.rights >= MIN_ASSET_RIGHTS_TO_HISTORY;
    },
    currentSingleAsset() {
      return this.assetEditor.getOpenedAssetFull();
    },
    isArticle() {
      return this.currentSingleAsset?.parentIds.includes(ARTICLE_ASSET_ID);
    },
    isDiscussion() {
      return this.currentSingleAsset?.parentIds.includes(DISCUSSION_ASSET_ID);
    },
    taskBlock() {
      if (this.currentSingleAsset) {
        return this.currentSingleAsset.blocks.find(
          (block) => block.name === 'info' && block.type === 'props',
        );
      }
      return null;
    },
    taskBlockProps() {
      if (this.taskBlock) {
        return this.taskBlock.props;
      }
      return {};
    },
    allAreAbstract() {
      return this.assetEditor.getAllAreAbstract();
    },
    currentAssetFull() {
      return this.assetEditor.getOpenedAssetFull();
    },
    taskWatchers(): AssetPropValueAccount[] {
      const res: AssetPropValueAccount[] = [];
      if (!this.taskBlockProps['watchers']) {
        return res;
      }
      for (const ind of this.taskBlockProps['watchers'] as number[]) {
        const watcher = castAssetPropValueToAccount(
          this.taskBlockProps[`watchers\\${ind}`],
        );
        if (watcher) res.push(watcher);
      }
      return res;
    },
  },
  methods: {
    async exportToJSONAsset() {
      const asset = this.currentAssetFull;
      if (!asset) return;
      await this.$getAppManager()
        .get(ProjectContentManager)
        .exportToJSONAsset(asset);
    },
    exportWithCustomFormat() {
      const asset = this.currentAssetFull;
      if (!asset) return;
      this.$getAppManager()
        .get(ProjectContentManager)
        .exportAssetWithCustomFormat(asset);
    },
    async exportToDocumentAsset(type: 'pdf' | 'md') {
      const asset = this.currentSingleAsset;
      if (!asset) return;
      await this.$getAppManager()
        .get(ProjectContentManager)
        .exportToDocumentAsset(asset, type);
    },
    async createInstance() {
      const asset = this.currentAssetFull;
      if (!asset) return;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          const fast_create_dialog = this.$getAppManager()
            .get(DialogManager)
            .create(FastCreateAssetDialog, {
              set: {
                workspaceId: asset.workspaceId,
                parentIds: [asset.id],
              },
            });
          const new_asset = await fast_create_dialog.open();
          if (new_asset) {
            await openProjectLink(
              this.$getAppManager(),
              this.assetEditor.projectInfo,
              {
                name: 'project-asset-by-id',
                params: {
                  assetId: new_asset.id,
                },
              },
            );
          }
        });
    },
    async createTask() {
      const asset = this.currentAssetFull;
      if (!asset) return;

      await this.$getAppManager()
        .get(TaskManager)
        .showCreateTaskDialog(
          {
            title:
              convertTranslatedTitle(asset.title, (key) => this.$t(key)) + ': ',
          },
          async (task) => {
            await this.$getAppManager()
              .get(CreatorAssetManager)
              .requestAssetInstanceInCache(asset.id);
            await this.$getAppManager()
              .get(CreatorAssetManager)
              .createRef({
                where: {
                  id: [asset.id],
                },
                targetAssetId: task.id,
              });
          },
        );
    },
    async createRef() {
      if (!this.assetEditor.openedAssetId) {
        return;
      }
      await this.assetEditor.openCreateRefDialog(false);
    },
    async openSettingsDialog() {
      if (!this.assetEditor.openedAssetId) {
        return;
      }
      await this.assetEditor.changeAsset([this.assetEditor.openedAssetId]);
    },
    async openSetUpAccessDialog() {
      await this.$getAppManager().get(DialogManager).show(SetUpAccessDialog, {
        assetId: this.currentSingleAsset?.id,
      });
    },
    async openLinksDialog() {
      if (!this.assetEditor.openedAssetId) {
        return;
      }
      await this.assetEditor.changeAssetLinks([this.assetEditor.openedAssetId]);
    },
    async copyLink() {
      try {
        const projectInfo = this.$getAppManager()
          .get(ProjectManager)
          .getProjectInfo();
        if (projectInfo && this.assetEditor.openedAssetId) {
          const taskNum = this.$getAppManager()
            .get(TaskManager)
            .getTaskViaCacheSync(this.assetEditor.openedAssetId)?.num;
          const link = getProjectLinkHref(
            this.$router,
            projectInfo,
            {
              name: 'project-tasks-task',
              params: {
                taskNum: taskNum,
              },
            },
            true,
          );
          await clipboardCopyPlainText(link);
          this.$getAppManager()
            .get(UiManager)
            .showSuccess(this.$t('asset.linkCopied'));
        }
      } catch (e) {
        console.error(e);
        this.$getAppManager().get(UiManager).showError(e);
      }
    },
    async renameAsset() {
      const asset = this.assetEditor.getOpenedAssetFull();
      if (!asset) return;

      const new_name = await this.$getAppManager()
        .get(DialogManager)
        .show(PromptDialog, {
          header: this.$t('common.dialogs.rename'),
          message: this.$t('asset.inputTitle'),
          yesCaption: this.$t('common.dialogs.rename'),
          value: this.currentSingleAsset?.title,
        });
      if (new_name) {
        await this.$getAppManager()
          .get(UiManager)
          .doTask(async () => {
            await this.$getAppManager()
              .get(CreatorAssetManager)
              .changeAssets({
                where: {
                  id: [asset.id],
                },
                set: {
                  title: new_name,
                },
              });
          });
      }
    },
    async showHistory() {
      if (!this.historyShown) return;
      assert(this.currentSingleAsset);
      await this.$getAppManager().get(DialogManager).show(AssetHistoryDialog, {
        assetId: this.currentSingleAsset.id,
      });
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetSettings {
  padding: 0;
}

:deep(.is-button-dropdown) {
  --button-font-size: 20px;
}
</style>

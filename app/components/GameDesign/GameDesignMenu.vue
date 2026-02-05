<template>
  <section>
    <div
      v-if="gddVM"
      class="GameDesignMenu"
      :class="{
        ['type-' + gddVM.type]: true,
      }"
    >
      <div class="GameDesignMenu-content">
        <div class="GameDesignMenu-header">
          <slot></slot>
          <project-tree-search
            v-model="searchValue"
            class="GameDesignMenu-header-search"
          ></project-tree-search>
        </div>
        <div class="GameDesignMenu-items tiny-scrollbars">
          <project-tree-presenter
            v-if="gddVM"
            ref="projectTree"
            :selection="selection"
            class="GameDesignMenu-treePresenter"
            selection-mode="single"
            :get-asset-menu="(asset) => gddVM?.getAssetMenu(asset) ?? []"
            :get-workspace-menu="
              (workspace) => gddVM?.getWorkspaceMenu(workspace) ?? []
            "
            :external-vm="gddVM"
            @update:selection="setSelection($event)"
          >
            <template #assetAppend="{ asset }">
              <notification-icon
                v-if="isAssetUnreadAny(asset.unread ?? 0)"
                class="GameDesignMenu-notificationIcon"
                :unread="asset.unread"
              ></notification-icon>
            </template>
            <template #workspaceAppend="{ workspace }">
              <notification-icon
                v-if="isAssetUnreadAny(workspace.unread ?? 0)"
                class="GameDesignMenu-notificationIcon"
                :unread="workspace.unread"
              ></notification-icon>
            </template>
          </project-tree-presenter>
          <context-menu-zone
            v-if="gddVM.type === 'gdd' && gddVM.rootWorkspaceId"
            class="GameDesignMenu-whiteSpace"
            :menu-list="whiteSpaceMenuList"
          >
            <template #item-createElement>
              <create-asset-box
                :root-workspace-id="gddVM.rootWorkspaceId"
              ></create-asset-box>
            </template>
            <template #item-createFolder>
              <create-folder-box
                :root-workspace-id="gddVM.rootWorkspaceId"
              ></create-folder-box>
            </template>
          </context-menu-zone>
        </div>
        <create-element-buttons
          v-if="showCreationButtons && gddVM.rootWorkspaceId"
          class="GameDesignMenu-Down"
          :root-workspace-id="gddVM.rootWorkspaceId"
          :root-workspace-type="gddVM.type"
          :vm="gddVM"
        ></create-element-buttons>
      </div>
    </div>
  </section>
</template>

<script type="text/ecmascript-6" lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { GameDesignMenuVM } from '../../logic/vm/GameDesignMenuVM';
import ProjectManager from '../../logic/managers/ProjectManager';
import ProjectTreePresenter from '../Asset/ProjectTree/ProjectTreePresenter.vue';
import {
  MIN_WORKSPACE_RIGHTS_TO_ADD_CONTENT,
  MIN_WORKSPACE_RIGHTS_TO_READ,
} from '../../logic/types/Rights';
import { HUB_PID } from '../../logic/constants';
import type { MenuListItem } from '../../logic/types/MenuList';
import ProjectContentManager from '../../logic/managers/ProjectContentManager';
import type { AssetPropValueSelection } from '../../logic/types/Props';
import ProjectTreeSearch from '../Asset/ProjectTree/ProjectTreeSearch.vue';
import CreateElementButtons from '../Asset/CreateElementButtons.vue';
import { isAssetUnreadAny } from '../../logic/types/AssetUnread';
import NotificationIcon from '../Asset/ProjectTree/NotificationIcon.vue';
import type { ProjectTreeSelectedItem } from '../../logic/vm/IProjectTreePresenterVM';
import ContextMenuZone from '../Common/ContextMenuZone.vue';
import CreateFolderBox from '../Asset/CreateFolderBox.vue';
import CreateAssetBox from '../Asset/CreateAssetBox.vue';
import { openProjectLink } from '../../logic/router/routes-helpers';

export default defineComponent({
  title: 'GameDesignMenu',
  components: {
    ProjectTreePresenter,
    ProjectTreeSearch,
    CreateElementButtons,
    NotificationIcon,
    ContextMenuZone,
    CreateFolderBox,
    CreateAssetBox,
  },
  props: {
    gddVM: { type: Object as PropType<GameDesignMenuVM>, required: true },
  },
  data() {
    return {
      selection: this.gddVM.selection,
    };
  },
  computed: {
    searchValue: {
      get() {
        return this.gddVM.searchValue;
      },
      set(val: AssetPropValueSelection | null) {
        const vm = this.gddVM;
        vm.searchValue = val;
      },
    },
    showCreationButtons() {
      return this.canCreateElements && !this.projectIsHub;
    },
    whiteSpaceContextMenuList(): MenuListItem[] {
      return [];
    },
    gddWorkspace() {
      return this.$getAppManager()
        .get(ProjectManager)
        .getWorkspaceByName('gdd');
    },
    whiteSpaceMenuList(): MenuListItem[] {
      return [
        {
          icon: 'ri-file-add-fill',
          title: this.$t('sourcePage.elements.create'),
          children: [
            {
              name: 'createElement',
            },
          ],
        },
        {
          icon: 'ri-folder-add-line',
          title: this.$t('sourcePage.folders.create'),
          children: [
            {
              name: 'createFolder',
            },
          ],
        },
        ...this.getImportExportMenuItems(),
      ];
    },
    isDesktop() {
      return this.$getAppManager().$appConfiguration.isDesktop;
    },
    menuAdditionalOptions(): MenuListItem[] {
      const project_info = this.$getAppManager()
        .get(ProjectManager)
        .getProjectInfo();
      if (!project_info) return [];
      const user_role = this.$getAppManager()
        .get(ProjectManager)
        .getUserRoleInProject();

      const project_local_path = this.projectInfo?.localPath;
      return [
        ...this.getImportExportMenuItems(),
        this.isDesktop && project_local_path
          ? {
              title: this.$t(
                'mainMenu.' +
                  (process.platform === 'darwin'
                    ? 'openInFinder'
                    : 'openInExplorer'),
              ),
              icon: 'ri-folder-open-line',
              action: async () => {
                await window.imshost.shell.showFolder(project_local_path);
              },
            }
          : null,
        user_role
          ? {
              title: this.$t('mainMenu.sync'),
              action: () => {
                openProjectLink(this.$getAppManager(), project_info, {
                  name: 'project-sync',
                });
              },
              icon: 'ri-link',
            }
          : null,
      ].filter((x) => x) as MenuListItem[];
    },
    canCreateElements() {
      return (
        this.$getAppManager().get(ProjectManager).canCreateAssets() &&
        this.gddVM &&
        this.gddVM.rootWorkspaceCached &&
        this.gddVM.rootWorkspaceCached.rights >=
          MIN_WORKSPACE_RIGHTS_TO_ADD_CONTENT
      );
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    projectIsHub() {
      return !!(this.projectInfo
        ? this.projectInfo.parentsTree.find((p) => p.id === HUB_PID)
        : false);
    },
    gddVMSelection() {
      return this.gddVM.selection;
    },
  },
  watch: {
    gddVMSelection() {
      if (
        JSON.stringify(this.selection) !== JSON.stringify(this.gddVMSelection)
      ) {
        this.selection = this.gddVMSelection;
      }
    },
  },
  methods: {
    focusMenuItem(item_type: 'asset' | 'workspace', item_id: string): boolean {
      if (!this.$refs['projectTree']) {
        return false;
      }
      return (
        this.$refs['projectTree'] as InstanceType<typeof ProjectTreePresenter>
      ).focusItem(item_type, item_id);
    },
    setSelection(val: ProjectTreeSelectedItem[]) {
      this.selection = val;
      const vm = this.gddVM;
      vm.selection = val;
    },
    getImportExportMenuItems(): MenuListItem[] {
      if (!this.gddWorkspace) return [];
      const gdd_workspace = this.gddWorkspace;
      return [
        this.gddWorkspace.rights >= MIN_WORKSPACE_RIGHTS_TO_ADD_CONTENT
          ? {
              title: this.$t('gddPage.import'),
              action: () =>
                this.$getAppManager()
                  .get(ProjectContentManager)
                  .importAsset(gdd_workspace),
              icon: 'import',
            }
          : null,
        this.gddWorkspace.rights >= MIN_WORKSPACE_RIGHTS_TO_READ
          ? {
              title: this.$t('gddPage.export'),
              icon: 'export',
              children: [
                {
                  title: this.$t('gddPage.exportToMD'),
                  action: () =>
                    this.$getAppManager()
                      .get(ProjectContentManager)
                      .exportWorkspaceToDocument(gdd_workspace, 'md'),
                },
                {
                  title: this.$t('gddPage.exportToPDF'),
                  action: () =>
                    this.$getAppManager()
                      .get(ProjectContentManager)
                      .exportWorkspaceToDocument(gdd_workspace, 'pdf'),
                },
                {
                  title: this.$t('gddPage.exportToJSON'),
                  action: () =>
                    this.$getAppManager()
                      .get(ProjectContentManager)
                      .exportWorkspaceToJSON(gdd_workspace),
                },
              ],
            }
          : null,
      ].filter((x) => x) as MenuListItem[];
    },
    isAssetUnreadAny,
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins';

.GameDesignMenu-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}
.GameDesignMenu {
  min-width: var(--menu-sizes);
  max-width: var(--menu-sizes);

  display: flex;
  flex-direction: column;
  background-color: var(--app-menu-bg-color);
  border-radius: 4px;
  padding: 15px 8px;

  @include devices-mixins.device-type(not-pc) {
    --menu-sizes: 285px;
    box-shadow: none;
    height: 90%;
    margin: 5px 15px 9px 5px;
    position: relative;
  }
  @include devices-mixins.device-type(pc) {
    --menu-sizes: 240px;
    height: 100%;
    margin: 9px 15px 0 14px;
    position: relative;
  }
}
.GameDesignMenu-header {
  display: flex;
  gap: 5px;
  margin-bottom: 10px;
  margin-left: 0px;
}
.GameDesignMenu-header-search {
  min-width: 0;
  flex: 1;
}

.GameDesignMenu-items {
  flex: 1;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  user-select: none;
}
.GameDesignMenu-addButton-left {
  width: 100%;
}
.GameDesignMenu-addButton-only {
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
  width: 100%;
}
.GameDesignMenu-Down {
  display: flex;
  margin-top: 10px;
}
.GameDesignMenu.type-gdd {
  .GameDesignMenu-treePresenter {
    --TreePresenter-left-padding: 2px;
    --TreePresenter-children-padding: 10px;
    --TreePresenter-arrow-gap: 1px;
    --TreePresenter-loading-padding: 2px;

    --TreePresenter-hl-bg-color: var(--app-menu-hl-bg-color);
  }
}
.GameDesignMenu.type-discussions {
  .GameDesignMenu-treePresenter {
    --TreePresenter-left-padding: 10px;
  }
}
.GameDesignMenu-whiteSpace {
  flex: 1;
  flex-shrink: 1;
}
.GameDesignMenu-notificationIcon {
  font-size: 10px;
}
.GameDesignMenu-treePresenter :deep(.ProjectTreePresenter-row) {
  &:hover,
  &[data-dropdown-shown] {
    .GameDesignMenu-notificationIcon {
      display: none;
    }
  }
}
</style>

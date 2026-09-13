<template>
  <centered-page
    class="GameDesignWorkspacePage GameDesignPage"
    :class="{ ['type-' + vm.gameDesignMenuVM.type]: true }"
    :bread-crumbs="breadCrumbs ?? undefined"
  >
    <template #header>
      <div class="GameDesignWorkspacePage-header">
        <workspace-header
          icon-class="asset-icon-folder-fill"
          :title="vm.workspace?.title ?? $t('translatedTitles.Items')"
          :can-rename="canRename"
          :show-share="!!(userIsAdmin && !isDesktop)"
          :menu-list="vm.workspaceMenu"
          :on-rename="renameWorkspace"
          @share="openSetUpAccessDialog()"
        >
          <template #item-createElement>
            <create-asset-box
              :root-workspace-id="workspaceId"
            ></create-asset-box>
          </template>
          <template #item-createFolder>
            <create-folder-box
              :root-workspace-id="workspaceId"
            ></create-folder-box>
          </template>
        </workspace-header>
        <RequestSignInBlock
          v-if="needShowRequestSignInBlock"
          class="GameDesignWorkspacePage-requestSignIn"
          :title="'auth.needAuthToEdit'"
        ></RequestSignInBlock>
      </div>
    </template>
    <div class="GameDesignWorkspacePage">
      <width-resizer
        v-model:content-width="contentWidth"
        :min-width="ASSET_FULL_EDITOR_MIN_WIDTH"
        :initial-width="ASSET_FULL_EDITOR_INITIAL_WIDTH"
        :resize-side="'right'"
        :disabled="needDisableResize"
      >
        <div v-if="vm.isLoading" class="loaderSpinner PageLoaderSpinner"></div>
        <div v-else-if="vm.loadError" class="PageError">{{ vm.loadError }}</div>
        <div
          v-else-if="vm.gameDesignMenuVM"
          class="GameDesignWorkspacePage-workspaceContent tiny-scrollbars"
        >
          <project-tree-presenter
            class="GameDesignWorkspacePage-treePresenter"
            :selection="selection"
            :asset-where="projectTreeWhere"
            :external-vm="vm.gameDesignMenuVM"
            :get-asset-menu="
              (asset) => vm.gameDesignMenuVM?.getAssetMenu(asset) ?? []
            "
            :get-workspace-menu="
              (workspace) =>
                vm.gameDesignMenuVM?.getWorkspaceMenu(workspace) ?? []
            "
            @update:selection="setSelection($event)"
          ></project-tree-presenter>
          <create-element-buttons
            v-if="canCreateElements"
            class="GameDesignWorkspacePage-Down"
            :root-workspace-id="workspaceId"
            :root-workspace-type="vm.gameDesignMenuVM.type"
            :vm="vm.gameDesignMenuVM"
          ></create-element-buttons>
        </div>
      </width-resizer>
    </div>
  </centered-page>
</template>

<script lang="ts">
import CenteredPage from '../Common/CenteredPage.vue';
import { defineComponent, type PropType, type UnwrapRef } from 'vue';
import ProjectTreePresenter from '../Asset/ProjectTree/ProjectTreePresenter.vue';
import UiPreferenceManager from '../../logic/managers/UiPreferenceManager';
import {
  ASSET_FULL_EDITOR_INITIAL_WIDTH,
  ASSET_FULL_EDITOR_MIN_WIDTH,
} from '../layoutConstants';
import ProjectManager from '../../logic/managers/ProjectManager';
import WidthResizer from '../Common/WidthResizer.vue';
import type { ProjectTreeSelectedItem } from '../../logic/vm/IProjectTreePresenterVM';
import type { BreadCrumbsEntity } from '../../logic/types/BreadCrumbs';
import type { WorkspacePageVM } from '../../logic/vm/WorkspacePageVM';
import {
  MIN_WORKSPACE_RIGHTS_TO_ADD_CONTENT,
  MIN_WORKSPACE_RIGHTS_TO_CHANGE,
} from '../../logic/types/Rights';
import RequestSignInBlock from '../Form/RequestSignInBlock.vue';
import AuthManager from '../../logic/managers/AuthManager';
import DialogManager from '../../logic/managers/DialogManager';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import SetUpAccessDialog from '../Asset/Rights/SetUpAccessDialog.vue';
import { useWorkspaceBreadcrumbs } from './workspaceUtils';
import UiManager, { ScreenSize } from '../../logic/managers/UiManager';
import CreateElementButtons from '../Asset/CreateElementButtons.vue';
import CreateFolderBox from '../Asset/CreateFolderBox.vue';
import CreateAssetBox from '../Asset/CreateAssetBox.vue';
import WorkspaceHeader from './WorkspaceHeader.vue';

export default defineComponent({
  name: 'GameDesignWorkspacePage',
  components: {
    CenteredPage,
    ProjectTreePresenter,
    WidthResizer,
    RequestSignInBlock,
    CreateElementButtons,
    CreateFolderBox,
    CreateAssetBox,
    WorkspaceHeader,
  },
  props: {
    vm: {
      type: Object as PropType<UnwrapRef<WorkspacePageVM>>,
      required: true,
    },
  },
  data() {
    return {
      ASSET_FULL_EDITOR_INITIAL_WIDTH,
      ASSET_FULL_EDITOR_MIN_WIDTH,
      selection: [] as ProjectTreeSelectedItem[],
    };
  },
  computed: {
    isDesktop() {
      return this.$getAppManager().$appConfiguration.isDesktop;
    },
    projectTreeWhere() {
      return {
        workspaceId: this.workspaceId,
      };
    },
    currentScreenType() {
      return this.$getAppManager().get(UiManager).screenSize;
    },
    needDisableResize() {
      return [ScreenSize.MB, ScreenSize.TB].includes(this.currentScreenType);
    },
    userIsAdmin() {
      return this.$getAppManager().get(ProjectManager).isAdmin();
    },
    allowAnonymUsers() {
      return this.$getAppManager().get(ProjectManager).getAllowAnonymUsers();
    },
    needShowRequestSignInBlock() {
      if (this.allowAnonymUsers) return false;
      return (
        !this.userInfo &&
        this.vm.workspace?.rights &&
        this.vm.workspace?.rights >= MIN_WORKSPACE_RIGHTS_TO_CHANGE
      );
    },
    userInfo() {
      return this.$getAppManager().get(AuthManager).getUserInfo();
    },
    canRename() {
      return !!(
        this.userInfo &&
        this.vm.workspace?.rights &&
        this.vm.workspace.rights >= MIN_WORKSPACE_RIGHTS_TO_CHANGE
      );
    },
    breadCrumbs(): BreadCrumbsEntity[] | null {
      if (this.workspaceId) {
        const list = useWorkspaceBreadcrumbs(this.workspaceId);
        return [...list];
      } else {
        return null;
      }
    },
    workspaceId() {
      const workspaceId = this.$route.params.workspaceId;
      const id = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
      return id;
    },
    contentWidth: {
      get(): number {
        return this.$getAppManager()
          .get(UiPreferenceManager)
          .getPreference(
            'AssetsPageContent.contentWidth',
            ASSET_FULL_EDITOR_INITIAL_WIDTH,
          );
      },
      set(val: number) {
        this.$getAppManager()
          .get(UiPreferenceManager)
          .setPreference('AssetsPageContent.contentWidth', val);
      },
    },
    canCreateElements() {
      return (
        this.vm.workspace?.rights &&
        this.vm.workspace.rights >= MIN_WORKSPACE_RIGHTS_TO_ADD_CONTENT
      );
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    gddVMSelection() {
      const gddVM = this.vm.gameDesignMenuVM;
      return gddVM ? gddVM.selection : [];
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
  mounted() {
    this.vm.init();
    this.selection = this.vm.gameDesignMenuVM.selection;
  },
  unmounted() {
    this.vm.destroy();
  },
  methods: {
    setSelection(val: ProjectTreeSelectedItem[]) {
      this.selection = val;
      const gddVM = this.vm.gameDesignMenuVM;
      if (gddVM) {
        gddVM.selection = val;
      }
    },
    async openSetUpAccessDialog() {
      await this.$getAppManager().get(DialogManager).show(SetUpAccessDialog, {
        workspaceId: this.workspaceId,
      });
    },
    async renameWorkspace(new_title: string) {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          if (this.vm.workspace?.id) {
            await this.$getAppManager()
              .get(CreatorAssetManager)
              .changeWorkspace(this.vm.workspace?.id, {
                title: new_title,
              });
          }
        });
    },
  },
});
</script>

<style lang="scss" scoped>
.GameDesignWorkspacePage.type-gdd {
  .GameDesignWorkspacePage-treePresenter {
    --TreePresenter-left-padding: 2px;
    --TreePresenter-children-padding: 10px;
    --TreePresenter-arrow-gap: 1px;
    --TreePresenter-loading-padding: 2px;
  }
}
.GameDesignWorkspacePage.type-discussions {
  .GameDesignWorkspacePage-treePresenter {
    --TreePresenter-left-padding: 10px;
  }
}

.GameDesignWorkspacePage-header {
  width: 100%;
  margin-bottom: 10px;
}
.GameDesignWorkspacePage-workspaceContent {
  padding: 20px 25px;
}
.GameDesignWorkspacePage-addButton-right,
.GameDesignWorkspacePage-addButton-left {
  display: flex;
  align-items: center;
  gap: 7px;
}
.GameDesignWorkspacePage-addButton-left {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  width: 100%;
}
.GameDesignWorkspacePage-addButton-right {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-left: none !important;
}
.GameDesignWorkspacePage-Down {
  display: flex;
  padding-top: 10px;
  max-width: 240px;
}
.GameDesignWorkspacePage-requestSignIn {
  margin-top: 15px;
}
</style>

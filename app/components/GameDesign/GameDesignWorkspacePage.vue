<template>
  <centered-page
    class="GameDesignWorkspacePage GameDesignPage"
    :class="{ ['type-' + vm.gameDesignMenuVM.type]: true }"
    :bread-crumbs="breadCrumbs ?? undefined"
  >
    <template #header>
      <div class="GameDesignWorkspacePage-common">
        <div class="GameDesignWorkspacePage-flex">
          <div class="GameDesignWorkspacePage-header">
            <div class="GameDesignWorkspacePage-title-wrapper">
              <div class="App-header">
                <i
                  class="asset-icon-folder-fill GameDesignWorkspacePage-title-icon"
                ></i>
                <h1>
                  <caption-string
                    :value="vm.workspace?.title ?? $t('translatedTitles.Items')"
                  ></caption-string>
                </h1>
              </div>
            </div>
          </div>
          <div
            v-if="vm.workspaceMenu.length > 0"
            class="GameDesignWorkspacePage-manage"
          >
            <button
              v-if="userIsAdmin && !isDesktop"
              class="is-button is-button-icon GameDesignWorkspacePage-manage-share"
              @click="openSetUpAccessDialog()"
            >
              <i class="ri-share-fill"></i>
            </button>
            <menu-button>
              <menu-list :menu-list="vm.workspaceMenu">
                <template #item-createElement>
                  <create-asset-box
                    :root-workspace-id="workspaceId"
                  ></create-asset-box>
                </template>
                <template #item-createFolder>
                  <create-folder-box
                    :root-workspace-id="workspaceId"
                  ></create-folder-box> </template
              ></menu-list>
            </menu-button>
          </div>
        </div>
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
import CaptionString from '../Common/CaptionString.vue';
import WidthResizer from '../Common/WidthResizer.vue';
import type { ProjectTreeSelectedItem } from '../../logic/vm/IProjectTreePresenterVM';
import type { BreadCrumbsEntity } from '../../logic/types/BreadCrumbs';
import MenuList from '../Common/MenuList.vue';
import MenuButton from '../Common/MenuButton.vue';
import type { WorkspacePageVM } from '../../logic/vm/WorkspacePageVM';
import {
  MIN_WORKSPACE_RIGHTS_TO_ADD_CONTENT,
  MIN_WORKSPACE_RIGHTS_TO_CHANGE,
} from '../../logic/types/Rights';
import RequestSignInBlock from '../Form/RequestSignInBlock.vue';
import AuthManager from '../../logic/managers/AuthManager';
import DialogManager from '../../logic/managers/DialogManager';
import SetUpAccessDialog from '../Asset/Rights/SetUpAccessDialog.vue';
import { useWorkspaceBreadcrumbs } from './workspaceUtils';
import UiManager, { ScreenSize } from '../../logic/managers/UiManager';
import CreateElementButtons from '../Asset/CreateElementButtons.vue';
import CreateFolderBox from '../Asset/CreateFolderBox.vue';
import CreateAssetBox from '../Asset/CreateAssetBox.vue';

export default defineComponent({
  name: 'GameDesignWorkspacePage',
  components: {
    CenteredPage,
    ProjectTreePresenter,
    CaptionString,
    WidthResizer,
    MenuButton,
    MenuList,
    RequestSignInBlock,
    CreateElementButtons,
    CreateFolderBox,
    CreateAssetBox,
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
        this.userInfo &&
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
  },
});
</script>

<style lang="scss" scoped>
@use '$style/asset-icons';

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

.GameDesignWorkspacePage-common {
  width: 100%;
  margin-bottom: 10px;
}
.GameDesignWorkspacePage-flex {
  display: flex;
}
.App-header {
  display: flex;
  align-items: center;
  gap: 10px;
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
.GameDesignWorkspacePage-title-icon {
  @include asset-icons.asset-icons;
}
.GameDesignWorkspacePage-header {
  display: flex;
  justify-content: space-between;
  flex: 1;
}

.GameDesignWorkspacePage-requestSignIn {
  margin-top: 15px;
}

.GameDesignWorkspacePage-title-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;

  .App-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 0px;
  }
}
.GameDesignWorkspacePage-manage {
  display: flex;
  align-items: center;

  :deep(.is-button-dropdown) {
    --button-font-size: 20px;
  }
}
.GameDesignWorkspacePage-manage-share {
  --button-font-size: 20px;
}
</style>

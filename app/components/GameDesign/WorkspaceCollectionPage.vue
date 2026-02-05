<template>
  <fully-filled-page
    :bread-crumbs="breadCrumbs ?? undefined"
    class="WorkspaceCollectionPage"
  >
    <template #header>
      <div class="WorkspaceCollectionPage-common">
        <div class="WorkspaceCollectionPage-flex">
          <div class="WorkspaceCollectionPage-header">
            <div class="WorkspaceCollectionPage-title-wrapper">
              <div class="App-header">
                <i
                  class="WorkspaceCollectionPage-title-icon"
                  :class="workspaceIcon"
                ></i>
                <renamable-text
                  :value="vm.workspace?.title ?? $t('translatedTitles.Items')"
                  :disabled="!canRename"
                  @change="renameWorkspace($event)"
                >
                  <h1 :title="canRename ? $t('gddPage.dblClickToRename') : ''">
                    <caption-string
                      :value="
                        isRenamingNewTitle
                          ? isRenamingNewTitle
                          : (vm.workspace?.title ??
                            $t('translatedTitles.Items'))
                      "
                    />
                  </h1>
                </renamable-text>
              </div>
            </div>
          </div>
          <div class="WorkspaceCollectionPage-manage">
            <project-link
              v-if="baseAsset && baseAssetLink && projectInfo"
              class="is-button WorkspaceCollectionPage-manage-baseAsset"
              :project="projectInfo"
              :to="baseAssetLink"
              @click.prevent="openBaseAsset"
            >
              <i class="ri-settings-3-fill"></i>
              <caption-string :value="baseAsset.title"></caption-string>
            </project-link>
            <button
              v-if="userIsAdmin && !isDesktop"
              class="is-button is-button-icon WorkspaceCollectionPage-manage-button"
              @click="openSetUpAccessDialog()"
            >
              <i class="ri-share-fill"></i>
            </button>
            <menu-button v-if="vm.workspaceMenu.length > 0">
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
          class="WorkspaceCollectionPage-requestSignIn"
          :title="'auth.needAuthToEdit'"
        ></RequestSignInBlock>
      </div>
    </template>
    <div class="WorkspaceCollectionPage">
      <div v-if="vm.isLoading" class="loaderSpinner PageLoaderSpinner"></div>
      <div v-else-if="vm.loadError" class="PageError">{{ vm.loadError }}</div>
      <div class="WorkspaceCollectionPage-workspaceContent tiny-scrollbars">
        <workspace-collection-content :vm="vm"></workspace-collection-content>
        <!-- здесь будет внутренний компонент collection-content и задам условие поиска workspaceId = папке коллекции
        workspace-collection-content удалится -->
      </div>
    </div>
  </fully-filled-page>
</template>

<script lang="ts">
import FullyFilledPage from '../Common/FullyFilledPage.vue';
import {
  defineAsyncComponent,
  defineComponent,
  type PropType,
  type UnwrapRef,
} from 'vue';
import UiPreferenceManager from '../../logic/managers/UiPreferenceManager';
import {
  ASSET_FULL_EDITOR_INITIAL_WIDTH,
  ASSET_FULL_EDITOR_MIN_WIDTH,
} from '../layoutConstants';
import ProjectManager from '../../logic/managers/ProjectManager';
import CaptionString from '../Common/CaptionString.vue';
import type { BreadCrumbsEntity } from '../../logic/types/BreadCrumbs';
import MenuList from '../Common/MenuList.vue';
import MenuButton from '../Common/MenuButton.vue';
import {
  MIN_WORKSPACE_RIGHTS_TO_ADD_CONTENT,
  MIN_WORKSPACE_RIGHTS_TO_CHANGE,
} from '../../logic/types/Rights';
import RequestSignInBlock from '../Form/RequestSignInBlock.vue';
import AuthManager from '../../logic/managers/AuthManager';
import DialogManager from '../../logic/managers/DialogManager';
import SetUpAccessDialog from '../Asset/Rights/SetUpAccessDialog.vue';
import { useWorkspaceBreadcrumbs } from './workspaceUtils';
import WorkspaceCollectionContent from './WorkspaceCollectionContent.vue';
import type { WorkspaceCollectionPageVM } from '../../logic/vm/Workspace/WorkspaceCollectionPageVM';
import ProjectLink from '../Common/ProjectLink.vue';
import UiManager from '../../logic/managers/UiManager';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import RenamableText from '../Common/RenamableText.vue';
import CreateFolderBox from '../Asset/CreateFolderBox.vue';
import CreateAssetBox from '../Asset/CreateAssetBox.vue';

export default defineComponent({
  name: 'WorkspaceCollectionPage',
  components: {
    FullyFilledPage,
    CaptionString,
    MenuButton,
    MenuList,
    RequestSignInBlock,
    WorkspaceCollectionContent,
    ProjectLink,
    RenamableText,
    CreateFolderBox,
    CreateAssetBox,
  },
  provide() {
    return {
      projectContext: this.vm,
    };
  },
  props: {
    vm: {
      type: Object as PropType<UnwrapRef<WorkspaceCollectionPageVM>>,
      required: true,
    },
  },
  data() {
    return {
      isRenamingNewTitle: null as string | null,
      ASSET_FULL_EDITOR_INITIAL_WIDTH,
      ASSET_FULL_EDITOR_MIN_WIDTH,
    };
  },
  computed: {
    isDesktop() {
      return this.$getAppManager().$appConfiguration.isDesktop;
    },
    canRename() {
      return (
        this.userInfo &&
        this.vm.workspace?.rights &&
        this.vm.workspace.rights >= MIN_WORKSPACE_RIGHTS_TO_CHANGE
      );
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
    workspaceIcon() {
      return this.vm.baseAsset?.icon
        ? 'asset-icon-' + this.vm.baseAsset.icon
        : 'ri-table-view';
    },
    baseAsset() {
      return this.vm.baseAsset;
    },
    baseAssetLink() {
      if (!this.baseAsset) return null;
      return {
        name: 'project-asset-by-id',
        params: {
          assetId: this.baseAsset.id,
        },
      };
    },
  },
  mounted() {
    this.vm.init();
  },
  unmounted() {
    this.vm.destroy();
  },
  methods: {
    async renameWorkspace(new_title: string) {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          this.isRenamingNewTitle = new_title;
          if (this.vm.workspace?.id) {
            await this.$getAppManager()
              .get(CreatorAssetManager)
              .changeWorkspace(this.vm.workspace?.id, {
                title: new_title,
              });
          }
          this.isRenamingNewTitle = null;
        });
    },
    async openSetUpAccessDialog() {
      await this.$getAppManager().get(DialogManager).show(SetUpAccessDialog, {
        workspaceId: this.workspaceId,
      });
    },
    async openBaseAsset() {
      const base_asset = this.baseAsset;
      if (!base_asset) {
        return;
      }
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.$getAppManager()
            .get(DialogManager)
            .show(
              defineAsyncComponent(
                () => import('../Asset/AssetPreviewDialog.vue'),
              ),
              {
                assetId: base_asset.id,
              },
            );
        });
    },
  },
});
</script>

<style lang="scss" scoped>
@use '$style/asset-icons';
.WorkspaceCollectionPage {
  --local-bg-color: var(--panel-bg-color);
  background-color: var(--panel-bg-color);
}
.WorkspaceCollectionPage-common {
  width: 100%;
  margin-bottom: 10px;
}
.WorkspaceCollectionPage-flex {
  display: flex;
}
.App-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.WorkspaceCollectionPage-workspaceContent {
  padding: 20px 25px;
  padding-left: 0 !important;
  padding-right: 0 !important;
}
.WorkspaceCollectionPage-addButton-right,
.WorkspaceCollectionPage-addButton-left {
  display: flex;
  align-items: center;
  gap: 7px;
}
.WorkspaceCollectionPage-addButton-left {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  width: 100%;
}
.WorkspaceCollectionPage-addButton-right {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-left: none !important;
}
.WorkspaceCollectionPage-Down {
  display: flex;
  padding-top: 10px;
  max-width: 240px;
}
.WorkspaceCollectionPage-title-icon {
  @include asset-icons.asset-icons;
}
.WorkspaceCollectionPage-header {
  display: flex;
  justify-content: space-between;
  flex: 1;
}

.WorkspaceCollectionPage-requestSignIn {
  margin-top: 15px;
}

.WorkspaceCollectionPage-title-wrapper {
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
.WorkspaceCollectionPage-manage-baseAsset {
  margin-right: 5px;
}
.WorkspaceCollectionPage-manage {
  display: flex;
  align-items: center;
  :deep(.is-button-dropdown) {
    --button-font-size: 20px;
  }
}
.WorkspaceCollectionPage-manage-button {
  --button-font-size: 20px;
}
</style>

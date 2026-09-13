<template>
  <fully-filled-page
    :bread-crumbs="breadCrumbs ?? undefined"
    class="WorkspaceCollectionPage"
  >
    <template #header>
      <div class="WorkspaceCollectionPage-header">
        <workspace-header
          :icon-class="workspaceIcon"
          :title="vm.workspace?.title"
          :can-rename="canRename"
          :show-share="!!(userIsAdmin && !isDesktop)"
          :menu-list="vm.workspaceMenu"
          :on-rename="renameWorkspace"
          @share="openSetUpAccessDialog()"
        >
          <template #manageStart>
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
          </template>
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
import CreateFolderBox from '../Asset/CreateFolderBox.vue';
import CreateAssetBox from '../Asset/CreateAssetBox.vue';
import WorkspaceHeader from './WorkspaceHeader.vue';

export default defineComponent({
  name: 'WorkspaceCollectionPage',
  components: {
    FullyFilledPage,
    CaptionString,
    RequestSignInBlock,
    WorkspaceCollectionContent,
    ProjectLink,
    CreateFolderBox,
    CreateAssetBox,
    WorkspaceHeader,
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
      ASSET_FULL_EDITOR_INITIAL_WIDTH,
      ASSET_FULL_EDITOR_MIN_WIDTH,
    };
  },
  computed: {
    isDesktop() {
      return this.$getAppManager().$appConfiguration.isDesktop;
    },
    canRename() {
      return !!(
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
          if (this.vm.workspace?.id) {
            await this.$getAppManager()
              .get(CreatorAssetManager)
              .changeWorkspace(this.vm.workspace?.id, {
                title: new_title,
              });
          }
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
.WorkspaceCollectionPage {
  --local-bg-color: var(--editor-bg-color);
  background-color: var(--local-bg-color);
}
.WorkspaceCollectionPage-header {
  width: 100%;
  margin-bottom: 10px;
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
.WorkspaceCollectionPage-requestSignIn {
  margin-top: 15px;
}
.WorkspaceCollectionPage-manage-baseAsset {
  margin-right: 5px;
}
</style>

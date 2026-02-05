<template>
  <div class="CreateElementButtons use-buttons-dotted">
    <template v-if="rootWorkspaceType === 'gdd'">
      <menu-button class="CreateElementButtons-asset">
        <template #button="{ toggle }">
          <button
            :title="$t('sourcePage.elements.create')"
            class="is-button CreateElementButtons-asset-button"
            @click="toggle"
          >
            <i
              :title="$t('sourcePage.elements.create')"
              class="ri-file-add-fill"
            ></i>
            <span>
              {{ $t('sourcePage.elements.create') }}
            </span>
          </button>
        </template>
        <create-asset-box
          :root-workspace-id="rootWorkspaceId"
          :root-workspace-type="rootWorkspaceType"
        ></create-asset-box>
      </menu-button>
      <menu-button class="CreateElementButtons-folder">
        <template #button="{ toggle }">
          <button
            :title="$t('sourcePage.folders.create')"
            class="is-button CreateElementButtons-folder-button"
            @click="toggle"
          >
            <i class="ri-folder-add-line"></i>
          </button>
        </template>
        <create-folder-box
          :root-workspace-id="rootWorkspaceId"
          :root-workspace-type="rootWorkspaceType"
        ></create-folder-box>
      </menu-button>
    </template>

    <template v-else>
      <button
        class="is-button CreateElementButtons-asset-button"
        @click="createDiscussion()"
      >
        <i
          :title="$t('sourcePage.discussions.create')"
          class="ri-message-2-fill"
        ></i>
        <span>
          {{ $t('sourcePage.discussions.create') }}
        </span>
      </button>
      <button
        :title="$t('sourcePage.folders.create')"
        class="is-button GameDesignMenu-addButton-right"
        @click="createFolder()"
      >
        <i class="ri-folder-add-line"></i>
      </button>
    </template>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import MenuButton from '../Common/MenuButton.vue';
import CreateAssetBox from './CreateAssetBox.vue';
import CreateFolderBox from './CreateFolderBox.vue';
import UiManager from '../../logic/managers/UiManager';
import DialogManager from '../../logic/managers/DialogManager';
import FastCreateAssetDialog from './FastCreateAssetDialog.vue';
import { DISCUSSION_ASSET_ID } from '../../logic/constants';
import { openProjectLink } from '../../logic/router/routes-helpers';
import ProjectManager from '../../logic/managers/ProjectManager';
import CreateWorkspaceDialog from './CreateWorkspaceDialog.vue';

export default defineComponent({
  name: 'CreateElementButtons',
  components: {
    MenuButton,
    CreateAssetBox,
    CreateFolderBox,
  },
  props: {
    rootWorkspaceId: { type: String, required: true },
    rootWorkspaceType: { type: String, default: null },
  },
  computed: {
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
  },
  methods: {
    async createDiscussion() {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          const new_disc = await this.$getAppManager()
            .get(DialogManager)
            .show(FastCreateAssetDialog, {
              set: {
                workspaceId: this.rootWorkspaceId,
                parentIds: [DISCUSSION_ASSET_ID],
              },
              disableChangeType: true,
              disableChangeWorkspace: true,
            });

          if (new_disc) {
            if (!this.projectInfo) return;
            openProjectLink(this.$getAppManager(), this.projectInfo, {
              name: 'project-asset-by-id',
              params: {
                assetId: new_disc.id,
              },
            });
          }
        });
    },
    async createFolder() {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          const res = await this.$getAppManager()
            .get(DialogManager)
            .show(CreateWorkspaceDialog, {
              parentId: this.rootWorkspaceId,
              type: 'folder',
              allowedTypes: ['folder'],
            });

          if (res) {
            if (!this.projectInfo) return;
            openProjectLink(this.$getAppManager(), this.projectInfo, {
              name: 'project-workspace-by-id',
              params: {
                workspaceId: res.entity.id,
              },
            });
          }
        });
    },
  },
});
</script>
<style lang="scss" scoped>
.CreateElementButtons-asset {
  flex: 1;
}
.CreateElementButtons-asset-button {
  --button-border-radius: 4px 0px 0px 4px;
  width: 100%;

  span {
    font-size: 12px;
  }
}
.CreateElementButtons-folder-button {
  --button-border-radius: 0px 4px 4px 0px;
}
</style>

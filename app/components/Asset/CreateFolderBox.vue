<template>
  <menu-list :menu-list="menuList" class="CreateFolderBox"></menu-list>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import MenuList from '../Common/MenuList.vue';
import type { MenuListItem } from '../../logic/types/MenuList';
import DialogManager from '../../logic/managers/DialogManager';
import CreateWorkspaceDialog from './CreateWorkspaceDialog.vue';
import { WORKSPACE_TYPE_COLLECTION } from '../../logic/types/Workspaces';
import ProjectManager from '../../logic/managers/ProjectManager';
import { openProjectLink } from '../../logic/router/routes-helpers';

export default defineComponent({
  name: 'CreateFolderBox',
  components: {
    MenuList,
  },
  props: {
    rootWorkspaceId: { type: String, required: true },
    rootWorkspaceType: { type: String, default: null },
  },
  computed: {
    where() {
      return {
        workspaceids: this.rootWorkspaceId,
      };
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    menuList(): MenuListItem[] {
      return [
        {
          title: this.$t('sourcePage.folders.types.folder'),
          action: async () => {
            await this.createFolder('folder');
          },
        },
        {
          title: this.$t('sourcePage.folders.types.collection'),
          action: async () => {
            await this.createFolder('collection');
          },
        },
      ];
    },
  },
  methods: {
    async createFolder(type: 'folder' | 'collection') {
      const res = await this.$getAppManager()
        .get(DialogManager)
        .show(CreateWorkspaceDialog, {
          type,
          parentId: this.rootWorkspaceId,
        });
      if (res && res.type === WORKSPACE_TYPE_COLLECTION) {
        if (!this.projectInfo) return;
        openProjectLink(this.$getAppManager(), this.projectInfo, {
          name: 'project-workspace-by-id',
          params: {
            workspaceId: res.entity.id,
          },
        });
      }
    },
  },
});
</script>
<style lang="scss" scoped>
.CreateFolderBox-assetSelect {
  padding: var(--dropdown-padding);
}
</style>

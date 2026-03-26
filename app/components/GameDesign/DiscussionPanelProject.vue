<template>
  <div class="DiscussionPanelProject use-buttons-dotted">
    <button
      class="is-button DiscussionPanelProject-button"
      @click="showContent = !showContent"
    >
      {{ projectInfo?.title }}
      <i
        :class="
          showContent ? 'ri-arrow-drop-up-line' : 'ri-arrow-drop-down-line'
        "
      ></i>
    </button>
    <div v-if="showContent">
      <div v-if="isLoading">
        <div class="loaderSpinner"></div>
      </div>
      <div v-else-if="loadError" class="error-message-block">
        {{ loadError }}
      </div>
      <game-design-menu
        v-else-if="gddVM"
        ref="gddMenu"
        class="ProjectTreePanel"
        :gdd-v-m="gddVM"
      ></game-design-menu>
    </div>
  </div>
</template>
<script lang="ts">
import { useProjectMenu } from '#components/useProjectMenu';
import { defineComponent, inject, useTemplateRef, type PropType } from 'vue';
import GameDesignMenu from './GameDesignMenu.vue';
import type { GameDesignMenuVM } from '#logic/vm/GameDesignMenuVM';
import { assert } from '#logic/utils/typeUtils';
import ProjectManager from '#logic/managers/ProjectManager';
import type {
  ProjectFullInfo,
  ProjectShortInfo,
} from '#logic/types/ProjectTypes';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';
const projectMenu = useProjectMenu();
const gddMenuRef = useTemplateRef('gddMenu');

export default defineComponent({
  name: 'DiscussionPanelProject',
  components: {
    GameDesignMenu,
  },
  props: {
    projectInfo: {
      type: Object as PropType<ProjectShortInfo>,
      required: true,
    },
    isOpen: {
      type: Boolean,
      default: () => false,
    },
  },
  setup() {
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    return {
      projectContext,
    };
  },
  data() {
    return {
      loadError: null as string | null,
      gddVM: null as GameDesignMenuVM | null,
      showContent: this.isOpen,
      project: null as ProjectFullInfo | null,
      isLoading: true,
    };
  },
  computed: {
    currentProjectInfo() {
      return this.projectContext.projectInfo;
    },
  },
  watch: {
    async showContent() {
      if (this.showContent) {
        await this.load();
      }
    },
  },
  async mounted() {
    if (this.showContent) {
      await this.load();
    }
    if (this.currentProjectInfo?.id === this.project?.id) {
      const revealed_item = projectMenu.getRevealedItem();
      if (gddMenuRef.value && revealed_item) {
        (gddMenuRef.value as any).focusMenuItem(
          revealed_item.type,
          revealed_item.id,
        );
      }
    }
  },
  unmounted() {
    if (this.gddVM) {
      this.gddVM.destroy();
      this.gddVM = null;
    }
  },
  methods: {
    async initVM(): Promise<GameDesignMenuVM | null> {
      assert(this.projectContext, 'Project context is not provided');
      const rootWorkspace = await this.projectContext
        .get(AssetSubContext)
        .getWorkspaceByNameViaCache('discussions');
      if (!rootWorkspace) return null;

      return projectMenu.initSubMenuGddVm(rootWorkspace.id);
    },
    async load() {
      try {
        this.isLoading = true;
        this.loadError = null;
        if (!this.project) {
          this.project = await this.$getAppManager()
            .get(ProjectManager)
            .getProjectFullInfoViaCache(this.projectInfo.id);
        }
        if (this.project && this.projectContext) {
          this.gddVM = await this.initVM();
        }
      } catch (err: any) {
        this.loadError = err.message;
      } finally {
        this.isLoading = false;
      }
      if (this.gddVM) {
        this.gddVM.init();
      }
    },
  },
});
</script>
<style>
.DiscussionPanelProject {
  margin: 0 10px;
}
.DiscussionPanelProject-button {
  width: 100%;
  --button-border-style: solid !important;
  display: flex;
  justify-content: space-between;
}
</style>

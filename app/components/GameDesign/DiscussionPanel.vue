<template>
  <div class="DiscussionPanel tiny-scrollbars">
    <DiscussionPanelProject
      v-for="project of projects"
      :key="project.id"
      :project-info="project"
      :is-open="currentProjectInfo?.id === project.id"
    >
    </DiscussionPanelProject>
    <div v-if="!isLoaded">
      <div class="loaderSpinner"></div>
    </div>
  </div>
</template>
<script lang="ts">
import ApiManager from '#logic/managers/ApiManager';
import { HttpMethods, Service } from '#logic/managers/ApiWorker';
import AuthManager from '#logic/managers/AuthManager';
import type { ProjectFullInfo } from '#logic/managers/ProjectManager';
import { defineComponent, inject } from 'vue';
import DiscussionPanelProject from './DiscussionPanelProject.vue';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';

export default defineComponent({
  name: 'DiscussionPanel',
  components: {
    DiscussionPanelProject,
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
      isLoaded: false,
      projects: [] as ProjectFullInfo[],
    };
  },
  computed: {
    userInfo() {
      return this.$getAppManager().get(AuthManager).getUserInfo();
    },
    currentProjectInfo() {
      return this.projectContext.projectInfo;
    },
  },
  async mounted() {
    this.isLoaded = false;
    if (this.userInfo) {
      const res: { list: ProjectFullInfo[]; total: number } =
        await this.$getAppManager()
          .get(ApiManager)
          .call(Service.CREATORS, HttpMethods.GET, 'app/projects', {
            ownerId: this.userInfo.id,
          });
      this.projects = [...res.list];
    }
    this.isLoaded = true;
  },
});
</script>
<style>
.DiscussionPanel {
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>

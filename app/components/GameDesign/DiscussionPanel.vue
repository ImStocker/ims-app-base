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
import type { IProjectInfo } from '#logic/managers/ProjectManager';
import { defineComponent } from 'vue';
import DiscussionPanelProject from './DiscussionPanelProject.vue';
import ProjectManager from '#logic/managers/ProjectManager';

export default defineComponent({
  name: 'DiscussionPanel',
  components: {
    DiscussionPanelProject,
  },
  data() {
    return {
      isLoaded: false,
      projects: [] as IProjectInfo[],
    };
  },
  computed: {
    userInfo() {
      return this.$getAppManager().get(AuthManager).getUserInfo();
    },
    currentProjectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
  },
  async mounted() {
    this.isLoaded = false;
    if (this.userInfo) {
      const res: { list: IProjectInfo[]; total: number } =
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

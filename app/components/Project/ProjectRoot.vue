<template>
  <div v-if="loadError" class="ProjectRoot ProjectRoot-error">
    {{ loadError }}
  </div>
  <slot></slot>
</template>
<script setup lang="ts">
import { useProjectMenu } from '#components/useProjectMenu';
import { provide, useAppManager } from '#imports';
import ProjectManager from '#logic/managers/ProjectManager';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { onMounted, ref } from 'vue';

const appManager = useAppManager();
const props = defineProps({
  projectId: {
    type: String,
    required: true,
  },
});

const loadError = ref<string | null>(null);
try {
  const projectContext = await appManager
    .get(ProjectManager)
    .requestProjectContext(props.projectId);
  if (!projectContext) {
    throw new Error('Project not found');
  }

  provide(injectedProjectContext, projectContext);

  onMounted(async () => {
    await projectContext.initClient();
  });
  const menu = useProjectMenu(projectContext);
  await menu.init();
} catch (err: any) {
  loadError.value = err.message;
}
</script>

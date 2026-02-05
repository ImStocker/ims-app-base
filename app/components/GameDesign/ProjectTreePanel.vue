<template>
  <game-design-menu
    v-if="gddVM"
    ref="gddMenu"
    class="ProjectTreePanel"
    :gdd-v-m="gddVM"
  ></game-design-menu>
  <div v-else-if="gddVMError" class="ProjectTreePanel state-error">
    {{ gddVMError }}
  </div>
</template>
<script lang="ts" setup>
import GameDesignMenu from './GameDesignMenu.vue';
import { useAppManager } from '../../composables/useAppManager';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import type { GameDesignMenuVM } from '../../logic/vm/GameDesignMenuVM';
import { useProjectMenu } from '../useProjectMenu';
import { onMounted, onUnmounted, useTemplateRef } from 'vue';
const appManager = useAppManager();
const projectMenu = useProjectMenu();

const gddMenuRef = useTemplateRef('gddMenu');

type ProjectTreePanelPropType = {
  type: 'gdd' | 'discussions';
};

const props = defineProps<{
  props: ProjectTreePanelPropType;
}>();

async function initVM(
  type: 'gdd' | 'discussions',
): Promise<GameDesignMenuVM | null> {
  const rootWorkspace = await appManager
    .get(CreatorAssetManager)
    .getWorkspaceByNameViaCache(type);
  if (!rootWorkspace) return null;

  return projectMenu.initSubMenuGddVm(rootWorkspace.id);
}

let gddVMError: string | null = null;
let gddVM: GameDesignMenuVM | null = null;

try {
  gddVM = await initVM(props.props.type);
} catch (err: any) {
  gddVMError = err.message;
}

onMounted(() => {
  if (gddVM) {
    gddVM.init();
  }
  const revealed_item = projectMenu.getRevealedItem();
  if (gddMenuRef.value && revealed_item) {
    gddMenuRef.value.focusMenuItem(revealed_item.type, revealed_item.id);
  }
});
onUnmounted(() => {
  if (gddVM) {
    gddVM.destroy();
    gddVM = null;
  }
});
</script>
<style lang="scss" scoped>
.ProjectTreePanel {
  flex: 1;
  min-height: 0;
  :deep(.GameDesignMenu) {
    --menu-sizes: 100%;
    margin: 0;
    padding: 0;
    height: 100%;
  }
  :deep(.GameDesignMenu-addButton-left-caption) {
    font-size: 12px;
  }
}
.ProjectTreePanel.state-error {
  color: var(--color-main-error);
}
</style>

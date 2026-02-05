<template>
  <GameDesignPage ref="page" :vm="assetPageVM"></GameDesignPage>
</template>
<script setup lang="ts">
import {
  definePageMeta,
  onMounted,
  useI18n,
  useNuxtApp,
  usePageHead,
  usePageVM,
  useRoute,
  useTemplateRef,
} from '#imports';
import GameDesignPage from '../../../../../../components/GameDesign/GameDesignPage.vue';
import { useProjectMenu } from '../../../../../../components/useProjectMenu';
import ProjectManager from '../../../../../../logic/managers/ProjectManager';
import UiManager from '../../../../../../logic/managers/UiManager';
import { getCurrentUrl } from '../../../../../../logic/router/routes-helpers';
import {
  convertTranslatedTitle,
  parseAnchorTagId,
} from '../../../../../../logic/utils/assets';
import { TITLE_CHAR_LIMIT } from '#logic/constants';
import { assert } from '../../../../../../logic/utils/typeUtils';
import { AssetPageVM } from '../../../../../../logic/vm/AssetPageVM';
const { t } = useI18n();
const { $getAppManager } = useNuxtApp();
const route = useRoute();

definePageMeta({
  name: 'project-asset-by-id',
  middleware: [
    'check-asset-access',
    async (to) => {
      const assetId = to.params.assetId.toString();
      const projectMenu = useProjectMenu();
      await projectMenu.revealProjectAsset(assetId);
      return true;
    },
  ],
});

const projectInfo = $getAppManager().get(ProjectManager).getProjectInfo();
assert(projectInfo, 'Project not loaded');

const assetId = route.params.assetId.toString();
const assetPageVM = await usePageVM(AssetPageVM, () => ({
  assetId,
  lang: $getAppManager().get(UiManager).getLanguage(),
}));

let caption = '';
const asset = assetPageVM.value.assetFullEditorVM.getOpenedAssetFull();
if (asset) {
  caption = convertTranslatedTitle(asset.title, (key) => t(key));
}
if (!caption) {
  const menu =
    $getAppManager().$appConfiguration.getProjectMenu($getAppManager());
  const gdd_menu_item = menu.find((x) => x.name.startsWith('project-'));
  caption = gdd_menu_item ? gdd_menu_item.title : '';
}

const page_ref = useTemplateRef<InstanceType<typeof GameDesignPage>>('page');
onMounted(() => {
  const current_url = getCurrentUrl();
  if (current_url.hash) {
    const parsed_block_ref = parseAnchorTagId(
      decodeURIComponent(current_url.hash.slice(1)),
    );
    if (parsed_block_ref) {
      if (page_ref.value) {
        page_ref.value.revealAssetBlock(
          parsed_block_ref.blockId,
          parsed_block_ref.anchor,
        );
      }
    }
  }
});

usePageHead(() => ({
  title: [
    caption.length > TITLE_CHAR_LIMIT
      ? caption.slice(0, TITLE_CHAR_LIMIT) + '...'
      : caption,
    projectInfo.title,
    'IMS Creators',
  ].join(' | '),
}));
</script>

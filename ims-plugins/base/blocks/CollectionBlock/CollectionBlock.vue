<template>
  <div class="CollectionBlock">
    <collection-content
      v-if="collectionBlockEditorController"
      :controller="collectionBlockEditorController"
    ></collection-content>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import CollectionContent from '#components/GameDesign/CollectionContent.vue';
import type { AssetChanger } from '#logic/types/AssetChanger';
import {
  convertTranslatedTitle,
  type ResolvedAssetBlock,
} from '#logic/utils/assets';
import UiManager from '#logic/managers/UiManager';
import ProjectManager from '#logic/managers/ProjectManager';
import { CollectionBlockEditorController } from './CollectionBlockController';
import {
  convertAssetPropsToPlainObject,
  normalizeAssetPropPart,
} from '#logic/types/Props';
import type { UserView } from '#components/Workspace/ViewOptions/viewUtils';
import {
  ViewType,
  VIEW_TYPES_MAP,
} from '#components/Workspace/ViewOptions/viewUtils';
import type { AssetBlockEditorVM } from '#logic/vm/AssetBlockEditorVM';
import CreatorAssetManager from '#logic/managers/CreatorAssetManager';
import type { Workspace } from '#logic/types/Workspaces';

export default defineComponent({
  name: 'CollectionBlock',
  components: {
    CollectionContent,
  },
  props: {
    assetBlockEditor: {
      type: Object as PropType<AssetBlockEditorVM>,
      required: true,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    assetChanger: {
      type: Object as PropType<AssetChanger>,
      required: true,
    },
    resolvedBlock: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
  },
  data() {
    return {
      collectionBlockEditorController:
        null as null | CollectionBlockEditorController,
      workspace: null as Workspace | null,
    };
  },
  computed: {
    lang() {
      return this.$getAppManager().get(UiManager).getLanguage();
    },
    workspacePlainProps() {
      return this.workspace
        ? convertAssetPropsToPlainObject(this.workspace.props)
        : {};
    },
    workspaceViews(): { [key: string]: UserView } {
      if (Object.keys(this.workspacePlainProps.views ?? {}).length === 0) {
        const view_title = convertTranslatedTitle('[[t:Table]]', (...args) =>
          this.$getAppManager().$t(...args),
        );
        const new_key = normalizeAssetPropPart(view_title);
        return {
          [new_key]: {
            filter: [],
            index: 1,
            key: new_key,
            props: [],
            sort: [],
            title: view_title,
            type: ViewType.TABLE,
            ...VIEW_TYPES_MAP[ViewType.TABLE].default(),
          },
        };
      }
      return this.workspacePlainProps.views as { [key: string]: UserView };
    },
  },
  async mounted() {
    if (this.assetBlockEditor.assetFull?.workspaceId) {
      this.workspace = await this.$getAppManager()
        .get(CreatorAssetManager)
        .getWorkspaceById(this.assetBlockEditor.assetFull?.workspaceId);
    }
    const gdd_workspace = this.$getAppManager()
      .get(ProjectManager)
      .getWorkspaceByName('gdd');
    if (!gdd_workspace) return;

    this.collectionBlockEditorController = new CollectionBlockEditorController(
      this.$getAppManager(),
      {
        searchQuery: {
          workspaceids: this.workspace ? this.workspace.id : gdd_workspace.id,
        },
        readViews: () => {
          return this.workspaceViews;
        },
        writeViews: async () => {},
      },
    );

    await this.collectionBlockEditorController.loadContent();
  },
});
</script>

<style lang="scss" scoped></style>

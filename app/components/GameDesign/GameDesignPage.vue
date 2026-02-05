<template>
  <component
    :is="layoutDescriptor.pageComponent"
    v-if="openedAssetId"
    ref="layout"
    class="GameDesignPage"
    :vm="vm"
    :bread-crumbs="breadCrumbs"
  ></component>
</template>

<script lang="ts">
import { defineComponent, type PropType, type UnwrapRef } from 'vue';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import type { SubscriberHandler } from '../../logic/types/Subscriber';
import ProjectManager from '../../logic/managers/ProjectManager';
import { openProjectLink } from '../../logic/router/routes-helpers';
import type { AssetPageVM } from '../../logic/vm/AssetPageVM';
import type { BreadCrumbsEntity } from '../../logic/types/BreadCrumbs';
import type { AssetShort } from '../../logic/types/AssetsType';
import EditorManager from '../../logic/managers/EditorManager';
import {
  BLOCK_NAME_LOCALE,
  BLOCK_NAME_PROPS,
  BLOCK_TYPE_LOCALE,
  BLOCK_TYPE_PROPS,
  TASK_ASSET_ID,
  TASK_LIST_ASSET_ID,
} from '../../logic/constants';
import DialogManager from '../../logic/managers/DialogManager';
import AssetPropsDialog from '../Asset/AssetPropsDialog.vue';

export default defineComponent({
  name: 'GameDesignPage',
  props: {
    vm: {
      type: Object as PropType<UnwrapRef<AssetPageVM>>,
      required: true,
    },
  },
  data() {
    return {
      assetEventsHandler: null as SubscriberHandler | null,
    };
  },
  computed: {
    layoutDescriptor() {
      if (!this.currentAssetFull) {
        return this.$getAppManager()
          .get(EditorManager)
          .getDefaultLayoutDescriptor();
      }
      return this.$getAppManager()
        .get(EditorManager)
        .getLayoutDescriptorForAsset(this.currentAssetFull);
    },
    currentAssetFull() {
      return this.vm.assetFullEditorVM.getOpenedAssetFull();
    },
    breadCrumbs(): BreadCrumbsEntity[] {
      if (!this.currentAssetFull) return [];

      const is_task_or_task_list = this.currentAssetFull.typeIds.some(
        (type_id) => {
          return type_id === TASK_ASSET_ID || type_id === TASK_LIST_ASSET_ID;
        },
      );
      if (is_task_or_task_list) {
        return [
          {
            name: 'project-all-tasks',
            title: this.$t('boardPage.tasks.allTasks'),
          },
        ];
      }

      let list: BreadCrumbsEntity[] = [];
      if (this.currentAssetFull.workspaceId) {
        list = this.getParentWorkspacesList(this.currentAssetFull.workspaceId);
      } else {
        list = [
          {
            title: this.$t('mainMenu.gameDesign'),
            name: 'project-workspace-by-name',
            params: {
              workspaceName: 'gdd',
            },
          },
        ];
      }
      return [...list];
    },
    openedAssetId() {
      return this.$route.params.assetId
        ? this.$route.params.assetId.toString()
        : null;
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
  },
  mounted() {
    this.$getAppManager().get(EditorManager).currentEditorPage = this;
    this.assetEventsHandler = this.$getAppManager()
      .get(CreatorAssetManager)
      .assetEvents.subscribe(async (ev) => {
        if (!this.projectInfo) return;
        if (!this.openedAssetId) return;

        const current_asset = this.currentAssetFull;
        if (!current_asset) return;

        // Update asset if referenced assets changed
        const current_asset_tracking = !!current_asset.getPropValue(
          '__meta',
          'complete_track',
          false,
        ).value;
        if (current_asset_tracking) {
          let reload_asset = false;
          for (const upserted_id of ev.upsert.ids) {
            const upserted_asset: AssetShort | undefined = ev.upsert.objects
              .assetFulls[upserted_id]
              ? ev.upsert.objects.assetFulls[upserted_id]
              : ev.upsert.objects.assetShorts[upserted_id];
            if (!upserted_asset) continue;
            if (!upserted_asset.typeIds.includes(TASK_ASSET_ID)) {
              continue;
            }
            reload_asset = current_asset.references.some((ref) => {
              return ref.targetAssetId === upserted_id;
            });
            if (reload_asset) break;
          }

          if (reload_asset) {
            await this.$getAppManager()
              .get(CreatorAssetManager)
              .getAssetInstance(current_asset.id, true);
          }
        }

        if (ev.deletedIds.includes(this.openedAssetId)) {
          // Check if deleted system base objects
          const asset = await this.$getAppManager()
            .get(CreatorAssetManager)
            .getAssetInstance(this.openedAssetId, true);
          if (!asset) {
            openProjectLink(this.$getAppManager(), this.projectInfo, {
              name: 'project-workspace-by-name',
              params: {
                workspaceName: 'gdd',
              },
            });
          }
          return;
        }
      });
  },
  unmounted() {
    const editor_manager = this.$getAppManager().get(EditorManager);
    if (editor_manager.currentEditorPage === this) {
      editor_manager.currentEditorPage = null;
    }
    if (this.assetEventsHandler) {
      this.assetEventsHandler.unsubscribe();
      this.assetEventsHandler = null;
    }
    this.vm.destroy();
  },
  methods: {
    getParentWorkspacesList(
      workspace_id: string,
      _workspace_routes: BreadCrumbsEntity[] = [],
    ): BreadCrumbsEntity[] {
      const parents =
        this.$getAppManager()
          .get(CreatorAssetManager)
          .getParentWorkspacesListFromCache(workspace_id) ?? [];
      return parents.map((workspace) => {
        return {
          title: workspace.title,
          name: 'project-workspace-by-id',
          params: {
            workspaceId: workspace.id,
          },
        };
      });
    },
    async revealAssetBlock(blockId: string, anchor?: string): Promise<boolean> {
      if (!this.currentAssetFull) {
        return false;
      }
      const blocks = await this.currentAssetFull.resolveBlocks();
      const resolved_block = blocks.mapIds[blockId];
      if (!resolved_block) return false;

      if (
        resolved_block.name === BLOCK_NAME_LOCALE &&
        resolved_block.type === BLOCK_TYPE_LOCALE &&
        this.layoutDescriptor.props.headerLocaleButton
      ) {
        this.openLocale();
        return true;
      }
      if (
        resolved_block.name === BLOCK_NAME_PROPS &&
        resolved_block.type === BLOCK_TYPE_PROPS &&
        this.layoutDescriptor.props.headerPropsButton
      ) {
        this.openProps();
        return true;
      }

      const layout = this.$refs['layout'] as any;
      if (!layout.revealAssetBlock) {
        return false;
      }

      return layout.revealAssetBlock(blockId, anchor);
    },
    async openLocale() {
      const asset_full = this.vm.assetFullEditorVM.getOpenedAssetFull();
      if (!asset_full) return null;
      await this.$getAppManager().get(DialogManager).show(AssetPropsDialog, {
        assetFull: asset_full,
        propName: 'locale',
      });
    },
    async openProps() {
      const asset_full = this.vm.assetFullEditorVM.getOpenedAssetFull();
      if (!asset_full) return null;
      await this.$getAppManager().get(DialogManager).show(AssetPropsDialog, {
        assetFull: asset_full,
        propName: 'props',
      });
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.GameDesignPage {
  // --local-bg-color: var(--panel-bg-color);
  // background-color: var(--local-bg-color);
}
</style>

<template>
  <dialog-content
    v-if="projectInfo"
    class="AssetLinksDialog"
    :loading-error="loadingError"
    @escape-press="dialog.close()"
    @enter-press="dialog.close()"
  >
    <template #header>
      {{ dialogHeader }}
    </template>

    <template #content>
      <div
        v-if="loadingDone && graph.list.length === 0"
        class="AssetLinksDialog-linksNo"
      >
        {{ $t('boardPage.linksNo') }}
      </div>

      <template v-else>
        <div class="AssetLinksDialog-settings" @dblclick="getLargeImage">
          <component
            :is="graphComponentId"
            :dialog="dialog"
            :assets="assets"
            :graph="graph"
            :main-node-key="currentNodes[0]"
            :force-loading="!loadingDone"
            @node-selected="reloadForNewNodes"
            @loading-done="loadingDone = true"
            @loading-error="loadingError = $event.error"
          />
        </div>
      </template>
    </template>

    <template #footer>
      <div class="Form-row-buttons">
        <div
          class="Form-row-buttons-center AssetLinksDialog-buttons use-buttons-action"
        >
          <button class="is-button accent" @click="dialog.close()">Ok</button>
        </div>
      </div>
    </template>
  </dialog-content>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { AssetShort, AssetsGraph } from '../../logic/types/AssetsType';
import DialogContent from '../Dialog/DialogContent.vue';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import UiManager from '../../logic/managers/UiManager';
import type { DialogInterface } from '../../logic/managers/DialogManager';
import ProjectManager from '../../logic/managers/ProjectManager';
import 'v-network-graph/lib/style.css';
import VNetworkGraphContent from './AssetLinksDialogGraphs/VNetworkGraphContent.vue';

type DialogProps = {
  assetIds: string[];
  workspaceId?: string;
};

type DialogResult = undefined;

export default defineComponent({
  name: 'AssetLinksDialog',
  components: {
    DialogContent,
    VNetworkGraphContent,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
    graphType: {
      type: String,
      default: 'network',
    },
  },
  data() {
    return {
      loadingError: null as string | null,
      loadingDone: false,
      assets: [] as AssetShort[],
      graph: {
        list: [],
        more: false,
        objects: {
          assets: {},
        },
      } as AssetsGraph,
      currentNodes: this.dialog.state.assetIds,
    };
  },
  computed: {
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    assetCount() {
      return this.dialog.state.assetIds.length;
    },
    dialogHeader() {
      return this.$t('gddPage.links');
    },
    graphComponentId() {
      return 'VNetworkGraphContent';
    },
  },
  async mounted() {
    await this.loadDataForNode(
      this.dialog.state.assetIds,
      this.dialog.state.workspaceId,
    );
  },
  methods: {
    getLargeImage() {},
    async loadDataForNode(
      nodeIds: string[] | undefined,
      workspaceId?: string | undefined,
    ) {
      this.loadingDone = false;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          this.graph = await this.$getAppManager()
            .get(CreatorAssetManager)
            .getAssetsListForGraph({
              where: {
                id: nodeIds,
                workspaceId: workspaceId,
              },
            });
        });
      this.loadingDone = true;
    },
    reloadForNewNodes(nodeIds: string[] | undefined) {
      this.currentNodes = nodeIds || [];
      this.loadDataForNode(nodeIds, this.dialog.state.workspaceId);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetLinksDialog {
  color: var(--local-text-color);
  font-size: var(--local-font-size);
  padding: 20px;
  width: 690px;
}

.AssetLinksDialog-loading {
  text-align: center;

  .loaderSpinner {
    font-size: 16px;
  }
}

.AssetLinksDialog-header {
  font-weight: bold;
}

.AssetLinksDialog-select {
  margin: 14px 0;
}

.AssetLinksDialog-buttons {
  gap: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
}

.AssetLinksDialog-settings {
  background: #fff;
  border-radius: 4px;
  background-image: linear-gradient(#eee 0.1em, transparent 0.1em),
    linear-gradient(90deg, #eee 0.1em, transparent 0.1em);
  background-size: 30px 30px;
  text-align: center;
  position: relative;
}

.AssetLinksDialog-settings:deep(span.edgeLabel) {
  background-color: #fff !important;
}

.AssetLinksDialog-setting {
  display: flex;
  margin-bottom: 10px;
  font-size: 14px;
  align-items: center;
}

.AssetLinksDialog-setting-name {
  min-width: 90px;
}

.AssetLinksDialog-setting-flex {
  display: flex;
  align-items: center;
}

.AssetLinksDialog-setting-checkbox {
  margin-right: 10px;
  cursor: pointer;
}

.AssetLinksDialog-setting-checkbox-label {
  width: 100%;
  cursor: pointer;
}

.AssetLinksDialog-messages {
  font-style: italic;
  color: #999;
}

.AssetLinksDialog-linksNo {
  text-align: center;
  color: #ccc;
  font-style: italic;
}

.AssetLinksDialog-node {
  fill: #dddd00;
}

.AssetLinksDialog-graph-box {
  height: 60vh;
}

.Dialog-content {
  width: 80% !important;
}
</style>

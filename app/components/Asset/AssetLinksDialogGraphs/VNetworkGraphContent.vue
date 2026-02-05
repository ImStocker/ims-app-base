<template>
  <div class="VNetworkGraph-actions">
    <button
      :title="$t('common.dialogs.back')"
      :class="{
        'is-button': true,
        'is-button-icon': true,
        'VNetworkGraph-action-button': undoStack.length > 0,
      }"
      @click="undo"
    >
      <i class="ri-arrow-left-line"></i>
    </button>
    <button
      :title="$t('common.dialogs.forward')"
      :class="{
        'is-button': true,
        'is-button-icon': true,
        'VNetworkGraph-action-button': redoStack.length > 0,
      }"
      @click="redo"
    >
      <i class="ri-arrow-right-line"></i>
    </button>
    <button
      :title="$t('assetLinksDialog.toCenter')"
      class="is-button is-button-icon VNetworkGraph-action-button"
      @click="toCenter"
    >
      <i class="ri-focus-2-line"></i>
    </button>
    <button
      v-show="hasManyPages"
      :title="$t('assetLinksDialog.previousLinks')"
      :class="{
        'is-button': true,
        'is-button-icon': true,
        'VNetworkGraph-action-button': currentPage > 0,
      }"
      @click="previousPage"
    >
      <i class="ri-arrow-left-s-line"></i>
    </button>
    <span class="is-button is-button-icon VNetworkGraph-action-button">
      {{ `${currentPage + 1} / ${pagedNodes.length}` }}
    </span>
    <button
      v-show="hasManyPages"
      :title="$t('assetLinksDialog.nextLinks')"
      :class="{
        'is-button': true,
        'is-button-icon': true,
        'VNetworkGraph-action-button': currentPage < pagedNodes.length - 1,
      }"
      @click="nextPage"
    >
      <i class="ri-arrow-right-s-line"></i>
    </button>
  </div>

  <div
    :class="{
      'AssetLinksDialog-graph-box': true,
      'VNetworkGraph-loader': true,
      'VNetworkGraph-loader-on': forceLoading || isLoading,
    }"
  >
    <div class="loaderSpinner" />
  </div>
  <v-network-graph
    id="display"
    ref="vNetworkGraph"
    :class="{
      'AssetLinksDialog-graph-box': true,
    }"
    :nodes="networkData.nodes"
    :edges="networkData.edges"
    :layouts="networkData.layouts"
    :event-handlers="nodesEventHandlers"
    :configs="vNetworkGraphConfig"
  >
    <template
      #override-node-label="{
        nodeId,
        scale,
        text,
        x,
        y,
        config,
        textAnchor,
        dominantBaseline,
      }"
    >
      <text
        v-show="scale < 2"
        :title="networkData.nodes[nodeId].fullName"
        x="0"
        y="0"
        :font-size="config.fontSize * scale"
        :text-anchor="textAnchor"
        :dominant-baseline="dominantBaseline"
        :fill="config.color"
        :transform="`translate(${x} ${y})`"
      >
        <template
          v-for="(line, index) in (getFormattedString(text, 8, 50) || '').split(
            '\n',
          )"
          :key="index"
        >
          <tspan x="0" :dy="index === 0 ? 0 : config.fontSize * 1.5">
            {{ line }}
          </tspan>
        </template>
      </text>
    </template>

    <template #override-node="{ nodeId, scale, config, ...slotProps }">
      <g>
        <rect
          v-if="networkData.nodes[nodeId].isInherit"
          :x="-config.radius * scale"
          :y="-config.radius * scale"
          :width="config.radius * scale * 2"
          :height="config.radius * scale * 2"
          :rx="config.radius * 0.2"
          v-bind="slotProps"
          :class="getStyleForNode(nodeId)"
        >
        </rect>
        <circle
          v-else
          :r="config.radius * scale"
          v-bind="slotProps"
          :class="getStyleForNode(nodeId)"
        >
        </circle>
        <foreignObject
          :width="config.radius * scale * 2"
          :height="config.radius * scale * 2"
          class="AssetLinksDialog-hidden-node-link-cont"
          :style="`transform: translate(-${config.radius * scale}px, -${config.radius * scale}px);`"
        >
          <a
            :title="addLineBreaks(networkData.nodes[nodeId].name || '', 8)"
            :href="getNodeLink(nodeId)"
            class="AssetLinksDialog-hidden-node-link"
            @click.prevent
            @mousedown.prevent
            @mouseup.prevent
          />
        </foreignObject>
      </g>
    </template>

    <template #edge-label="{ scale, edge, ...slotProps }">
      <v-edge-label
        v-if="scale < 2"
        :text="edge.label"
        :scale="1"
        align="center"
        vertical-align="center"
        v-bind="slotProps"
      />
    </template>
  </v-network-graph>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type {
  AssetShort,
  AssetsGraph,
  AssetsGraphItem,
} from '../../../logic/types/AssetsType';
import ProjectManager from '../../../logic/managers/ProjectManager';
import {
  VNetworkGraph,
  VEdgeLabel,
  type Edges,
  type Nodes,
  type Layouts,
  type VNetworkGraphInstance,
  type EventHandlers,
} from 'v-network-graph';
import 'v-network-graph/lib/style.css';
import { getVNetworkConfig } from './VNetworkGraphConfig';
import { getProjectLinkHref } from '../../../logic/router/routes-helpers';
import { convertTranslatedTitle } from '../../../logic/utils/assets';

interface LinkInfo {
  [key: string]: {
    edges: Edges;
    hasSources: boolean;
    title: string;
  };
}

export default defineComponent({
  name: 'AssetLinksDialog',
  components: {
    VNetworkGraph,
    VEdgeLabel,
  },
  props: {
    assets: {
      type: Array as PropType<AssetShort[]>,
      required: true,
    },
    graph: {
      type: Object as PropType<AssetsGraph>,
      required: true,
    },
    mainNodeKey: {
      type: String,
      required: true,
    },
    historyCapacity: {
      type: Number,
      default: 10,
    },
    nodesLimitForPage: {
      type: Number,
      default: 25,
    },
    forceLoading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['node-selected', 'loading-done'],
  data() {
    return {
      currentKey: 0,
      isLoading: true,
      nodeRadius: 15,
      nodesInARowMax: 4,
      nodeLabelFontSize: 10,
      networkData: {
        nodes: {} as Nodes,
        edges: {} as Edges,
        layouts: { nodes: {} } as Layouts,
      },
      undoStack: [] as string[],
      redoStack: [] as string[],
      currentPage: 0,
      pagedNodes: [] as Nodes[],
      pagedEdges: [] as Edges[],
      pagedLayouts: [] as Layouts[],
    };
  },
  computed: {
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    vNetworkGraphConfig() {
      return getVNetworkConfig(this.nodeRadius, this.nodeLabelFontSize);
    },
    nodesEventHandlers() {
      return {
        'node:click': ({ node }) => {
          this.handleNodeClick(node);
        },
      } as EventHandlers;
    },
    hasManyPages() {
      return this.pagedNodes.length > 1;
    },
  },
  watch: {
    async graph() {
      await this.loadGraph();
      this.$emit('loading-done');
    },
  },
  async created() {
    await this.loadGraph();
  },
  methods: {
    async loadGraph() {
      this.isLoading = true;
      this.currentPage = 0;
      this.pagedNodes = [];
      this.pagedEdges = [];
      this.pagedLayouts = [];

      const newNodes = await this.loadNodes();
      const links = {} as LinkInfo;
      for (const link of this.graph.list) {
        if (!newNodes[link.source] || !newNodes[link.target]) continue;
        const edgeName = `${newNodes[link.source].localId}__${newNodes[link.target].localId}__${link.type}`;
        const edge = {
          source: link.source,
          target: link.target,
          label: this.getLinkLabel(link),
        };
        if (link.type === 'inherit') newNodes[link.target].isInherit = true;
        let nodeKey;
        let hasSource;
        if (link.source !== this.mainNodeKey) {
          nodeKey = link.source;
          hasSource = true;
        } else nodeKey = link.target;
        if (!links[nodeKey])
          links[nodeKey] = {
            edges: { [edgeName]: edge },
            hasSources: hasSource,
            title: newNodes[nodeKey].name || '',
          };
        else {
          links[nodeKey].edges[edgeName] = edge;
          if (hasSource) links[nodeKey].hasSources = true;
        }
      }

      let sourceCount = 0;
      let targetCount = 0;
      Object.entries(links).forEach(([key, value]) => {
        let page: number;
        if (value.hasSources) {
          page = Math.floor(sourceCount / this.nodesLimitForPage);
          sourceCount++;
        } else {
          page = Math.floor(targetCount / this.nodesLimitForPage);
          targetCount++;
        }
        if (!this.pagedNodes[page]) {
          this.pagedNodes.push({});
          this.pagedNodes[page][this.mainNodeKey] = {
            name: newNodes[this.mainNodeKey].name,
            isInherit: newNodes[this.mainNodeKey].isInherit,
          };
          this.pagedEdges.push({});
        }
        this.pagedNodes[page][key] = {
          name: value.title,
          isInherit: newNodes[key].isInherit,
        };
        this.pagedEdges[page] = { ...this.pagedEdges[page], ...value.edges };
      });

      for (const edges of this.pagedEdges)
        this.pagedLayouts.push(await this.loadLayoutInArc(edges));
      this.networkData = {
        nodes: this.pagedNodes[0],
        edges: this.pagedEdges[0],
        layouts: this.pagedLayouts[0],
      };
      this.toCenter();
      this.isLoading = false;
    },
    async loadNodes(): Promise<Nodes> {
      const nodes = {} as Nodes;
      const allAssetIds = Object.keys(this.graph.objects.assets);
      let count = 1;
      for (const assetId of allAssetIds) {
        const asset = this.graph.objects.assets[assetId];

        const asset_title =
          convertTranslatedTitle(asset.title || '', (key: any) =>
            this.$t(key),
          ) || '';
        nodes[assetId] = {
          name: asset_title,
          localId: count,
          isInherit: false,
        };
        count++;
      }
      return nodes;
    },
    async loadLayoutInArc(edges: Edges): Promise<Layouts> {
      const layouts = { nodes: {} } as Layouts;
      const currentId = this.mainNodeKey || '';

      layouts.nodes[currentId] = {
        x: 0,
        y: 0,
      };

      const sources = [] as string[];
      const targets = [] as string[];
      const duplicationCheck = new Set<string>();

      Object.values(edges).forEach((value) => {
        if (value.source !== this.mainNodeKey) {
          if (!duplicationCheck.has(value.source)) {
            sources.push(value.source);
            duplicationCheck.add(value.source);
          }
        } else if (value.target != this.mainNodeKey) {
          if (!duplicationCheck.has(value.target)) {
            targets.push(value.target);
            duplicationCheck.add(value.target);
          }
        }
      });

      const arcNodeDist = 5 * this.nodeRadius;
      const shortMult = 0.8;
      const basicAngle = (Math.PI / 180) * 140;
      let distance = Math.max(
        100,
        (arcNodeDist * (sources.length + 1)) / basicAngle,
      );
      let startAngle = (Math.PI - basicAngle) / 2;
      let angleStep = basicAngle / (sources.length + 1);
      let currentDist = distance;
      let alt = false;
      for (let i = 0; i < sources.length; i++) {
        if (i !== sources.length / 2)
          if (alt) {
            currentDist = distance * shortMult;
            alt = !alt;
          } else {
            currentDist = distance;
            alt = !alt;
          }
        layouts.nodes[sources[i]] = {
          x: currentDist * Math.cos(startAngle + (i + 1) * angleStep),
          y: currentDist * Math.sin(startAngle + (i + 1) * angleStep),
        };
      }

      distance = Math.max(100, 40 * targets.length);
      startAngle = 1.5 * Math.PI - basicAngle / 2;
      angleStep = basicAngle / (targets.length + 1);
      currentDist = distance;
      alt = false;
      for (let i = 0; i < targets.length; i++) {
        if (i !== targets.length / 2)
          if (alt) {
            currentDist = distance * shortMult;
            alt = !alt;
          } else {
            currentDist = distance;
            alt = !alt;
          }
        layouts.nodes[targets[i]] = {
          x: currentDist * Math.cos(startAngle + (i + 1) * angleStep),
          y: currentDist * Math.sin(startAngle + (i + 1) * angleStep),
        };
      }
      return layouts;
    },
    handleNodeClick(nodeId: string) {
      this.undoStack.push(this.mainNodeKey);
      if (this.undoStack.length > this.historyCapacity) this.undoStack.pop();
      this.$emit('node-selected', [nodeId]);
    },
    getStyleForNode(nodeId: string) {
      if (nodeId === this.mainNodeKey) return 'AssetLinksDialog-node-main';
      return 'AssetLinksDialog-node';
    },
    addLineBreaks(line: string, limit: number) {
      const parts = line.split(' ');
      let result: string = '';
      let count = 0;
      for (const part of parts) {
        count += part.length;
        result += part;
        if (count >= limit) {
          result += '\n';
          count = 0;
        } else result += ' ';
      }
      return result;
    },
    getCutString(line: string, symbolsLimit: number) {
      if (line.length > symbolsLimit)
        return line.slice(0, symbolsLimit) + '...';
      return line;
    },
    getFormattedString(
      line: string,
      limitForLine: number,
      limitForSymbols: number = -1,
    ) {
      const res = this.addLineBreaks(line, limitForLine);
      if (limitForSymbols > 0) return this.getCutString(res, limitForSymbols);
      return res;
    },
    getNodeLink(assetId: string) {
      const asset_link = getProjectLinkHref(this.$router, this.projectInfo, {
        name: 'project-asset-by-id',
        params: {
          assetId: assetId,
        },
      });
      return asset_link;
    },
    toCenter() {
      const gr = this.$refs.vNetworkGraph as VNetworkGraphInstance;
      const sizes = gr.getSizes();
      gr.panTo({ x: 0 + sizes.width / 2, y: 0 + sizes.height / 2 });
    },
    undo() {
      if (this.isLoading) return;
      if (this.undoStack.length > 0) {
        const state = this.undoStack.pop();
        this.redoStack.push(this.mainNodeKey);
        if (this.redoStack.length > this.historyCapacity) this.redoStack.pop();
        this.$emit('node-selected', [state]);
      }
    },
    redo() {
      if (this.isLoading) return;
      if (this.redoStack.length > 0) {
        const state = this.redoStack.pop();
        this.undoStack.push(this.mainNodeKey);
        if (this.undoStack.length > this.historyCapacity) this.undoStack.pop();
        this.$emit('node-selected', [state]);
      }
    },
    getLinkLabel(link: AssetsGraphItem) {
      switch (link.type) {
        case 'inherit':
          return this.$t('assetLinksDialog.derives');
        case 'task':
          return '';
        case 'mention':
          return '';
        case 'formula':
          return 'formula';
        case 'reference':
          return this.$t('assetLinksDialog.ref');
        default:
          return '';
      }
    },
    nextPage() {
      if (this.currentPage < this.pagedNodes.length - 1) {
        this.currentPage++;
        this.networkData = {
          nodes: this.pagedNodes[this.currentPage],
          edges: this.pagedEdges[this.currentPage],
          layouts: this.pagedLayouts[this.currentPage],
        };
      }
    },
    previousPage() {
      if (this.currentPage > 0) {
        this.currentPage--;
        this.networkData = {
          nodes: this.pagedNodes[this.currentPage],
          edges: this.pagedEdges[this.currentPage],
          layouts: this.pagedLayouts[this.currentPage],
        };
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetLinksDialog-node {
  fill: #dddd00;
  transition: 0.1s;
}

.AssetLinksDialog-node-main {
  fill: #fd7514;
  transition: 0.1s;
}

.AssetLinksDialog-graph-box {
  height: 60vh;
  position: relative;
}

.AssetLinksDialog-hidden-node-link-cont {
  overflow: visible;
  border-radius: 100%;
  opacity: 0;
}

.AssetLinksDialog-hidden-node-link {
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
}

.VNetworkGraph-loader {
  position: absolute;
  background-color: transparent;
  transition: 0.2s;
  width: 100%;
  z-index: 100;
  pointer-events: none;
  justify-content: center;
  align-items: center;
  display: flex;
  opacity: 0;
}

.VNetworkGraph-loader-on {
  opacity: 1;
  background-color: #000000c0;
  pointer-events: all;
}

.VNetworkGraph-actions {
  display: flex;
  position: absolute;
  z-index: 2;
  background-color: transparent;
}

.VNetworkGraph-action-button {
  transition: 0.15s;
}

.VNetworkGraph-action-button:hover {
  color: black;
}
</style>

<template>
  <div class="ContentToPDF AssetPreviewDialog-main-common">
    <div class="AssetPreviewDialog-main-common-content">
      <div
        v-if="workspaceInfo.workspace"
        :id="`workspace-${workspaceInfo.workspace.id}`"
        :name="`workspace-${workspaceInfo.workspace.id}`"
        class="ContentToPDF-workspace"
      >
        <i
          class="asset-icon-folder-fill ContentToPDF-AssetPageHeader-title-icon"
        ></i>
        <h1 class="ContentToPDF-workspace-title">
          {{ prevLevel }}
          <caption-string
            :value="workspaceInfo.workspace.title"
          ></caption-string>
        </h1>
      </div>
      <div class="ContentToPDF-assets">
        <div
          v-for="asset_info of workspaceInfo.assetInfos"
          :key="asset_info.assetFull.id"
        >
          <div class="ContentToPDF-AssetPageHeader-title">
            <div
              :id="`asset-${asset_info.assetFull.id}`"
              :name="`asset-${asset_info.assetFull.id}`"
              class="ContentToPDF-App-header"
            >
              <i
                :class="
                  'asset-icon-' + (asset_info.assetFull.icon ?? 'file-fill')
                "
                class="ContentToPDF-AssetPageHeader-title-icon"
              ></i>
              <h2 class="ContentToPDF-asset-title">
                <caption-string :value="asset_info.assetFull.title" />
              </h2>
            </div>
          </div>
          <ContentToPDFAsset
            :asset-info="asset_info"
            @update:render-state="
              childAssetsRenderStates.set(asset_info.assetFull.id, $event)
            "
          ></ContentToPDFAsset>
        </div>
        <div v-if="workspaceInfo.workspaceInfos.length > 0">
          <ContentToPDF
            v-for="(workspace_info, index) of workspaceInfo.workspaceInfos"
            :key="index"
            class="AssetPreviewDialog-main-common"
            :workspace-info="workspace_info"
            :level="level + 1"
            :prev-level="
              prevLevel.length > 0
                ? `${prevLevel}${index + 1}.`
                : `${index + 1}.`
            "
            @update:render-state="
              childWorkspacesRenderStates.set(
                workspace_info.workspace?.id ?? '',
                $event,
              )
            "
          ></ContentToPDF>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type {
  ExportingContent,
  ExportingContentRenderState,
} from '../../../logic/utils/convertToPDF';
import CaptionString from '../../Common/CaptionString.vue';
import ContentToPDFAsset from './ContentToPDFAsset.vue';

export default defineComponent({
  name: 'ContentToPDF',
  components: {
    CaptionString,
    ContentToPDFAsset,
  },
  props: {
    workspaceInfo: {
      type: Object as PropType<ExportingContent>,
      required: true,
    },
    level: {
      type: Number,
      default: 1,
    },
    prevLevel: {
      type: String,
      default: '1.',
    },
  },
  emits: ['update:render-state'],
  data() {
    return {
      childWorkspacesRenderStates: new Map<
        string,
        ExportingContentRenderState
      >(),
      childAssetsRenderStates: new Map<string, ExportingContentRenderState>(),
    };
  },
  computed: {
    renderState(): ExportingContentRenderState {
      const render_state: ExportingContentRenderState = {
        renderedBlocks: 0,
        totalBlocks: 0,
      };
      for (const workspace of this.workspaceInfo.workspaceInfos) {
        const state = workspace.workspace
          ? this.childWorkspacesRenderStates.get(workspace.workspace.id)
          : undefined;
        if (state) {
          render_state.totalBlocks += state.totalBlocks;
          render_state.renderedBlocks += state.renderedBlocks;
        }
      }
      for (const asset of this.workspaceInfo.assetInfos) {
        const state = this.childAssetsRenderStates.get(asset.assetFull.id);
        if (state) {
          render_state.totalBlocks += state.totalBlocks;
          render_state.renderedBlocks += state.renderedBlocks;
        }
      }
      return render_state;
    },
  },
  watch: {
    renderState() {
      this.$emit('update:render-state', this.renderState);
    },
  },
  mounted() {
    this.$emit('update:render-state', this.renderState);
  },
});
</script>
<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/asset-icons';
@use '$style/devices-mixins';
.ContentToPDF {
  color: #000;

  .AssetBlockEditor-block {
    --local-bg-color: #ffffff;
    --local-box-color: #fff;
    --local-font-size: 15px;
    --local-font-family: 'Ubuntu', Arial, Helvetica Neue, Helvetica, sans-serif;
    --local-text-color: #000000;
    --local-link-color: #000000;
    --local-border-color: #cccccc;
    --local-hl-bg-color: #f5f7fc;
    --local-hl-text-color: var(--local-text-color);
    --local-sub-text-color: #000000;
    background-color: #fff !important;
  }
}
.ContentToPDF-workspace {
  display: flex;
  gap: 10px;
  font-size: 30px;
  align-items: center;
}
.ContentToPDF-workspace-title {
  font-size: 24px;
  margin: 10px 0;
}
.ContentToPDF-assets {
  padding-left: 10px;
}
.ContentToPDF-asset-title {
  font-size: 20px;
  margin: 10px 0;
}
.ContentToPDF-AssetPageHeader-title {
  display: flex;
  align-items: center;
  gap: 10px;

  .ContentToPDF-App-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 0px;
  }
}
.ContentToPDF-AssetPageHeader-title-icon {
  @include asset-icons.asset-icons;
}

.ContentToPDF-AssetPageHeader-parent {
  display: flex;
  align-items: center;
}

.ContentToPDF-AssetPageHeader-parent-link {
  color: var(--text-intense);
  text-decoration: none;
  cursor: pointer;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-left: 5px;

  &:hover {
    text-decoration: underline;
  }
}
</style>

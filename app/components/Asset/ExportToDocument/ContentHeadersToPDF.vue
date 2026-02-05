<template>
  <div class="ContentHeadersToPDF AssetPreviewDialog-main-common">
    <div class="AssetPreviewDialog-main-common-content">
      <div v-if="workspaceInfo.workspace" class="ContentHeadersToPDF-workspace">
        <p class="ContentHeadersToPDF-workspace-title">
          {{ prevLevel }}
          <a :href="`#workspace-${workspaceInfo.workspace.id}`">
            <caption-string
              :value="workspaceInfo.workspace.title"
            ></caption-string>
          </a>
        </p>
      </div>
      <div class="ContentHeadersToPDF-assets">
        <div
          v-for="asset_info of workspaceInfo.assetInfos"
          :key="asset_info.assetFull.id"
        >
          <div
            v-if="workspaceInfo.workspace"
            class="ContentHeadersToPDF-AssetPageHeader-title"
          >
            <div class="ContentHeadersToPDF-App-header">
              <i
                :class="
                  'asset-icon-' + (asset_info.assetFull.icon ?? 'file-fill')
                "
                class="ContentHeadersToPDF-AssetPageHeader-title-icon"
              ></i>
              <a :href="`#asset-${asset_info.assetFull.id}`">
                <p class="ContentHeadersToPDF-asset-title">
                  <caption-string :value="asset_info.assetFull.title" />
                </p>
              </a>
            </div>
          </div>
        </div>
        <div v-if="workspaceInfo.workspaceInfos.length > 0">
          <ContentHeadersToPDF
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
          ></ContentHeadersToPDF>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { ExportingContent } from '../../../logic/utils/convertToPDF';
import CaptionString from '../../Common/CaptionString.vue';

export default defineComponent({
  name: 'ContentHeadersToPDF',
  components: {
    CaptionString,
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
  methods: {},
});
</script>
<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/asset-icons';
@use '$style/devices-mixins';
.ContentHeadersToPDF-workspace {
  display: flex;
  gap: 10px;
  align-items: center;
}
.ContentHeadersToPDF-workspace-title {
  margin: 10px 0;
  display: flex;
  gap: 10px;
}
.ContentHeadersToPDF-assets {
  padding-left: 10px;
}
.ContentHeadersToPDF-asset-title {
  margin: 10px 0;
}
.ContentHeadersToPDF-AssetPageHeader-title {
  display: flex;
  align-items: center;
  gap: 10px;

  .ContentHeadersToPDF-App-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 0px;
  }
}
.ContentHeadersToPDF-AssetPageHeader-title-icon {
  @include asset-icons.asset-icons;
}

.ContentHeadersToPDF-AssetPageHeader-parent {
  display: flex;
  align-items: center;
}

.ContentHeadersToPDF-AssetPageHeader-parent-link {
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

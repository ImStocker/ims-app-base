<template>
  <div class="ProjectTreePresenterContents">
    <div
      class="ProjectTreePresenter-row type-contents ProjectTreePresenterContents-row"
    >
      <div v-if="loading" class="ProjectTreePresenterContents-loading">
        <div
          class="ProjectTreePresenterContents-loading-spinner loaderSpinner"
        ></div>
        <div class="ProjectTreePresenterContents-loading-label">
          {{ $t('common.loading') }}
        </div>
      </div>
      <div v-else-if="loadError" class="ProjectTreePresenterContents-error">
        {{ loadError }}
      </div>
      <asset-content-tree-presenter
        v-else-if="assetContents.length > 0 && editorContext"
        v-model:selection="selection"
        class="ProjectTreePresenterContents-tree"
        :asset-contents="assetContents"
        :asset-id="assetId"
        :editor-context="editorContext"
        @keydown.stop
        @select="selectAsset($event)"
      ></asset-content-tree-presenter>
      <div v-else class="ProjectTreePresenterContents-no-contents">
        {{ $t('gddPage.menu.noContentHeaders') }}
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { ProjectTreeItemPayload } from './ProjectTreePresenterBaseVM';
import type { TreePresenterItem } from '../../Common/TreePresenter/TreePresenter';
import type { EditorContextForAssetRequested } from '../../../logic/managers/EditorManager';
import EditorManager from '../../../logic/managers/EditorManager';
import AssetContentTreePresenter from './AssetContentTreePresenter.vue';

export default defineComponent({
  name: 'ProjectTreePresenterContents',
  components: {
    AssetContentTreePresenter,
  },
  props: {
    item: {
      type: Object as PropType<TreePresenterItem<ProjectTreeItemPayload>>,
      required: true,
    },
  },
  data() {
    return {
      loading: false,
      loadError: null as string | null,
      editorContextForAssetRequest:
        null as EditorContextForAssetRequested | null,
    };
  },
  computed: {
    assetId() {
      return this.item.payload.id;
    },
    editorContext() {
      return this.editorContextForAssetRequest?.get() ?? null;
    },
    assetContents() {
      return this.editorContext ? this.editorContext.getContentItems() : [];
    },
    selection: {
      get() {
        if (!this.editorContext) return [];
        return this.editorContext.getSelectedContentIds();
      },
      set(ids: string[]) {
        if (!this.editorContext) return;
        this.editorContext.setSelectedContentIds(ids);
      },
    },
  },
  watch: {
    assetId() {
      this.resetEditorContext(true);
    },
  },
  mounted() {
    this.resetEditorContext(true);
  },
  unmounted() {
    this.resetEditorContext(false);
  },
  methods: {
    async resetEditorContext(init: boolean) {
      if (this.editorContextForAssetRequest) {
        this.editorContextForAssetRequest.release();
        this.editorContextForAssetRequest = null;
      }
      if (init) {
        this.editorContextForAssetRequest = this.$getAppManager()
          .get(EditorManager)
          .requestEditorContextForAsset(this.assetId);
        const assigned_request = this.editorContextForAssetRequest;
        try {
          this.loading = true;
          await this.editorContextForAssetRequest.promise;
        } catch (err: any) {
          if (this.editorContextForAssetRequest === assigned_request) {
            this.loadError = err.message;
          }
        } finally {
          if (this.editorContextForAssetRequest === assigned_request) {
            this.loading = false;
          }
        }
      }
    },
    async selectAsset(e: {
      assetId: string;
      blockId: string;
      anchor: string;
      selectable: any;
    }) {
      const open_res = await this.$getAppManager()
        .get(EditorManager)
        .openAsset(this.assetId, 'self', e.blockId, e.anchor).mounted;
      if (open_res.navigated && e.selectable && this.editorContext) {
        this.editorContext.setSelectedContentIds([e.assetId]);
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/asset-icons';

.ProjectTreePresenterContents-loading {
  display: flex;
  align-items: center;
  gap: 5px;
}
.ProjectTreePresenterContents-loading {
  font-style: italic;
  color: var(--local-sub-text-color);
}
.ProjectTreePresenterContents-error {
  color: var(--color-main-error);
}
.ProjectTreePresenterContents-no-contents {
  color: var(--local-sub-text-color);
  font-style: italic;
}
.ProjectTreePresenterContents-row {
  padding-left: 8px;
  font-size: 14px;
}
.ProjectTreePresenterContents-tree {
  flex: 1;
  overflow: hidden;
}
</style>

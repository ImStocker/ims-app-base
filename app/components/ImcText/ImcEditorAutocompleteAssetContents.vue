<template>
  <div class="ImcEditorAutocompleteAssetContents">
    <div class="ImcEditorAutocompleteAssetContents-row">
      <div v-if="loading" class="ImcEditorAutocompleteAssetContents-loading">
        <div
          class="ImcEditorAutocompleteAssetContents-loading-spinner loaderSpinner"
        ></div>
        <div class="ImcEditorAutocompleteAssetContents-loading-label">
          {{ $t('common.loading') }}
        </div>
      </div>
      <div
        v-else-if="loadError"
        class="ImcEditorAutocompleteAssetContents-error"
      >
        {{ loadError }}
      </div>
      <asset-content-tree-presenter
        v-else-if="assetContents.length > 0 && editorContext"
        ref="treePresenter"
        v-model:selection="selection"
        class="ImcEditorAutocompleteAssetContents-tree"
        :asset-contents="assetContents"
        :asset-id="assetId"
        :editor-context="editorContext"
        :show-menu="false"
        selection-kind="item"
        @keydown.stop="onKeydown"
        @select="$emit('select', $event)"
        @vue:mounted="onTreeMounted"
      ></asset-content-tree-presenter>
      <div v-else class="ImcEditorAutocompleteAssetContents-no-contents">
        {{ $t('gddPage.menu.noContentHeaders') }}
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineAsyncComponent, defineComponent } from 'vue';
import type { EditorContextForAssetRequested } from '../../logic/managers/EditorManager';
import EditorManager from '../../logic/managers/EditorManager';
import type AssetContentTreePresenter from '../Asset/ProjectTree/AssetContentTreePresenter.vue';
import type { BlockContentItem } from '../../logic/types/BlockTypeDefinition';

export default defineComponent({
  name: 'ImcEditorAutocompleteAssetContents',
  components: {
    AssetContentTreePresenter: defineAsyncComponent(
      () => import('../Asset/ProjectTree/AssetContentTreePresenter.vue'),
    ),
  },
  props: {
    assetId: {
      type: String,
      required: true,
    },
  },
  emits: ['select'],
  data() {
    return {
      loaded: false,
      loading: false,
      loadError: null as string | null,
      editorContextForAssetRequest:
        null as EditorContextForAssetRequested | null,
      requestFocus: false,
      selection: [] as string[],
    };
  },
  computed: {
    editorContext() {
      return this.editorContextForAssetRequest?.get() ?? null;
    },
    assetContents() {
      return this.editorContext ? this.editorContext.getContentItems() : [];
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
    focus() {
      const treePresenter = this.$refs['treePresenter'] as InstanceType<
        typeof AssetContentTreePresenter
      > | null;
      if (!treePresenter || !this.loaded) {
        this.requestFocus = true;
      } else {
        this._acitvateFocus();
      }
    },
    _acitvateFocus() {
      const treePresenter = this.$refs['treePresenter'] as InstanceType<
        typeof AssetContentTreePresenter
      > | null;
      if (!treePresenter) return;
      treePresenter.focus();
    },
    onTreeMounted() {
      if (this.requestFocus) {
        setTimeout(() => {
          this._acitvateFocus();
        }, 10);
        this.requestFocus = false;
      }
    },
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
            this.loaded = true;
          }
        }
      }
    },
    onKeydown(ev: KeyboardEvent) {
      if (ev.key === 'Enter') {
        const find_option = (where: BlockContentItem<any>[]) => {
          for (const opt of where) {
            if (opt.blockId + ':' + opt.itemId === this.selection[0]) {
              return opt;
            }
            if (opt.children) {
              const inside = find_option(opt.children);
              if (inside) return inside;
            }
          }
          return null;
        };
        const selected_option =
          this.selection.length > 0 ? find_option(this.assetContents) : null;
        if (selected_option) {
          this.$emit('select', {
            assetId: this.assetId,
            blockId: selected_option.blockId,
            anchor: selected_option.anchor,
            selectable: selected_option.selectable,
            title: selected_option.title,
          });
        }
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.ImcEditorAutocompleteAssetContents-loading {
  display: flex;
  align-items: center;
  gap: 5px;
}
.ImcEditorAutocompleteAssetContents-loading {
  font-style: italic;
  color: var(--local-sub-text-color);
}
.ImcEditorAutocompleteAssetContents-error {
  color: var(--color-main-error);
}
.ImcEditorAutocompleteAssetContents-no-contents {
  color: var(--local-sub-text-color);
  font-style: italic;
}
.ImcEditorAutocompleteAssetContents-row {
  padding-left: 8px;
  font-size: 14px;
}
.ImcEditorAutocompleteAssetContents-tree {
  flex: 1;
  overflow: hidden;
}
</style>

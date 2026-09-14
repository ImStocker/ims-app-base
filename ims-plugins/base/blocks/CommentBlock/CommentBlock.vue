<template>
  <div class="CommentBlock">
    <div class="CommentBlock-header">
      <i class="ri-chat-3-line CommentBlock-header-icon"></i>
      <span class="CommentBlock-header-title">
        <caption-string :value="title" />
      </span>
    </div>
    <div v-if="loading" class="CommentBlock-loading loaderSpinner"></div>
    <div v-else-if="loadError" class="CommentBlock-error error-message-block">
      {{ loadError }}
    </div>
    <component
      :is="editorComponent"
      v-else-if="editorComponent"
      ref="editor"
      :readonly="readonly"
      :model-value="body"
      :block-id="resolvedBlock.id"
      class="CommentBlock-editor"
      @update:model-value="onBodyChange($event)"
      @focus="enterEditMode()"
      @blur="save()"
    ></component>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent, shallowRef } from 'vue';
import type { AssetChanger } from '#logic/types/AssetChanger';
import type { AssetBlockEditorVM } from '#logic/vm/AssetBlockEditorVM';
import type { AssetDisplayMode, ResolvedAssetBlock } from '#logic/utils/assets';
import type { AssetRights } from '#logic/types/Rights';
import { MIN_ASSET_RIGHTS_TO_CHANGE } from '#logic/types/Rights';
import { castAssetPropValueToString, makeBlockRef } from '#logic/types/Props';
import type MarkdownEditor from '#components/ImcMarkdownEditor/ImcMarkdownEditor.vue';
import type { EditorBlockHandler } from '#components/Asset/Editor/EditorBlock';
import CaptionString from '#components/Common/CaptionString.vue';

export default defineComponent({
  name: 'CommentBlock',
  components: {
    CaptionString,
  },
  props: {
    readonly: {
      type: Boolean,
      default: false,
    },
    assetChanger: {
      type: Object as PropType<AssetChanger>,
      required: true,
    },
    assetBlockEditor: {
      type: Object as PropType<AssetBlockEditorVM>,
      required: true,
    },
    editorBlockHandler: {
      type: Object as PropType<EditorBlockHandler>,
      default: null,
    },
    resolvedBlock: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
    displayMode: {
      type: String as PropType<AssetDisplayMode>,
      default: () => 'normal',
    },
    rights: {
      type: Number as PropType<AssetRights>,
      required: true,
    },
    requestToolbarTarget: {
      type: Function as PropType<() => Promise<HTMLElement | null>>,
      default: null,
    },
    blockController: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      editorComponent: shallowRef(null as null | typeof MarkdownEditor),
      loading: true,
      loadError: null as null | string,
      body: '',
      $parsing: false,
    };
  },
  computed: {
    isReadOnly(): boolean {
      return this.readonly || this.rights < MIN_ASSET_RIGHTS_TO_CHANGE;
    },
    title(): string {
      return (
        this.resolvedBlock.title ??
        this.resolvedBlock.name ??
        this.$t('blockTypes.titles.comment')
      );
    },
    commentValue(): string {
      return castAssetPropValueToString(
        this.resolvedBlock.computed?.['__comment'],
      );
    },
  },
  watch: {
    commentValue: {
      immediate: true,
      handler(val: string) {
        if (this.$parsing) return;
        this.body = val ?? '';
      },
    },
  },
  async mounted() {
    try {
      this.editorComponent = (
        await import('#components/ImcMarkdownEditor/ImcMarkdownEditor.vue')
      ).default;
    } catch (err: any) {
      this.loadError = err.message;
    } finally {
      this.loading = false;
    }
    await new Promise((r) => setTimeout(r, 100));
  },
  methods: {
    enterEditMode() {
      if (this.isReadOnly) return;
      this.assetBlockEditor.enterEditMode(this.resolvedBlock.id);
    },
    onBodyChange(newBody: string) {
      this.body = newBody;
      this.commitValue();
    },
    commitValue() {
      if (this.body === this.commentValue) return;
      this.$parsing = true;
      this.assetChanger.setBlockPropKey(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        '__comment',
        this.body,
      );
      this.$nextTick(() => {
        this.$parsing = false;
      });
    },
    async save() {
      if (this.isReadOnly) return;
      this.commitValue();
      if (this.editorBlockHandler) {
        await this.editorBlockHandler.save();
      }
      this.assetBlockEditor.exitEditMode();
    },
  },
});
</script>

<style lang="scss" scoped>
.CommentBlock {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px 12px 18px;
  margin-left: 4px;
  border-radius: 12px;
  background: var(--local-bg-color, rgba(0, 0, 0, 0.035));
  border: 1px solid var(--local-border-color, rgba(0, 0, 0, 0.12));

  &::before {
    content: '';
    position: absolute;
    left: 6px;
    top: 10px;
    bottom: 10px;
    width: 3px;
    border-radius: 3px;
    background: var(--color-accent);
  }
}

.CommentBlock-header {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--local-sub-text-color);
  font-size: 12px;
  line-height: 1.2;
  min-width: 0;
}

.CommentBlock-header-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.CommentBlock-header-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.CommentBlock-editor {
  width: 100%;
  min-height: 32px;
  font-size: var(--local-font-size);
}
</style>

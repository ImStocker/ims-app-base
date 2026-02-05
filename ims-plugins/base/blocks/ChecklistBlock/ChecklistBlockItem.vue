<template>
  <div
    v-logical-focus-in="focusIn"
    v-logical-focus-out="focusOut"
    class="ChecklistBlockItem"
    :class="{
      'state-editMode': editMode,
      'state-error': dirtyValueError,
      'state-complete': isChecked,
      'state-drag-over': dragProps.dragOn === entry.key,
      ['state-drag-what-' + dragProps.dragWhat]: !!dragProps.dragWhat,
      'ChecklistBlockItem-active': isFocused,
    }"
    :draggable="true"
    @imc-focus-at="onFocusAt"
    @dragstart="dragStart($event)"
    @mouseover="mouseEnterHandler($event)"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <i
      v-if="dirtyValueError"
      class="ri-error-warning-fill ChecklistBlockItem-dirtyValueError"
      :title="dirtyValueError"
    />
    <div class="ChecklistBlockItem-check">
      <template v-if="!isEmpty">
        <span
          v-if="vm.isEntryLoading(entry)"
          class="loaderSpinner ChecklistBlockItem-loading"
        />
        <task-checkbox
          v-else
          class="ChecklistBlockItem-check-input is-interactive"
          :size="18"
          :disabled="readonly"
          :model-value="isChecked"
          :loading="vm.isEntryCheckInProcess(entry)"
          @update:model-value="check(!isChecked)"
        ></task-checkbox>
      </template>
    </div>
    <div
      class="ChecklistBlockItem-content"
      :class="{
        'state-inherited': displayMode === 'normal' && entry.inherited,
      }"
    >
      <imc-editor
        v-if="editMode"
        ref="editor"
        class="ChecklistBlockItem-content-editor ref-ChecklistBlockItem-content-editor"
        :model-value="dirtyValue"
        :placeholder="$t('assetEditor.checklistBlockNewItem')"
        @update:model-value="rename($event)"
        @pre-enter="$emit('preEnter')"
        @focus="isItemEditorFocused = true"
        @blur="isItemEditorFocused = false"
        @vue:unmounted="isItemEditorFocused = false"
      />
      <imc-presenter
        v-else
        class="ChecklistBlockItem-presenter"
        :title="$t('assetEditor.textBlockChangeText')"
        :value="entry.title"
      />
    </div>
    <slot
      name="checklist-item-append"
      :item="entry"
      :shown="isFocused || isHovered"
    ></slot>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent, type UnwrapRef } from 'vue';
import ImcEditor from '#components/ImcText/ImcEditor.vue';
import ImcPresenter from '#components/ImcText/ImcPresenter.vue';
import {
  type AssetPropValue,
  isFilledAssetPropValue,
} from '#logic/types/Props';
import type { AssetBlockEditorVM } from '#logic/vm/AssetBlockEditorVM';
import type { ChecklistBlockItemObject } from './ChecklistBlock';
import TaskCheckbox from '#components/Common/TaskCheckbox.vue';
import type { AssetDisplayMode, ResolvedAssetBlock } from '#logic/utils/assets';
import type ChecklistBlockVM from './ChecklistBlockVM';
import type { ChecklistBlockDragProps } from './ChecklistBlockVM';

export default defineComponent({
  name: 'ChecklistBlockItem',
  components: {
    ImcPresenter,
    ImcEditor,
    TaskCheckbox,
  },
  props: {
    entry: {
      type: Object as PropType<ChecklistBlockItemObject>,
      required: true,
    },
    editMode: {
      type: Boolean,
      default: false,
    },
    assetBlockEditor: {
      type: Object as PropType<AssetBlockEditorVM>,
      required: true,
    },
    validateChecklistItemName: {
      type: Function as PropType<(val: AssetPropValue) => string | null>,
      required: true,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    displayMode: {
      type: String as PropType<AssetDisplayMode>,
      default: () => 'normal',
    },
    dragProps: {
      type: Object as PropType<ChecklistBlockDragProps>,
      default: null,
      required: false,
    },
    resolvedBlock: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
    vm: {
      type: Object as PropType<UnwrapRef<ChecklistBlockVM>>,
      required: true,
    },
  },
  emits: ['rename', 'check', 'preEnter', 'blur'],
  data() {
    return {
      dirtyValue: this.entry ? this.entry.title : (null as AssetPropValue),
      isItemEditorFocused: false,
      allowDrag: true,
      isFocused: false,
      isHovered: false,
    };
  },
  computed: {
    isEmpty() {
      return !isFilledAssetPropValue(this.entry.title);
    },
    dirtyValueError() {
      return this.validateChecklistItemName(this.dirtyValue);
    },
    isChecked() {
      return this.vm.isEntryChecked(this.entry);
    },
  },
  watch: {
    entry() {
      this.dirtyValue = this.entry ? this.entry.title : null;
    },
    editMode() {
      this.dirtyValue = this.entry ? this.entry.title : null;
    },
  },
  methods: {
    focusIn() {
      this.isFocused = true;
    },
    focusOut() {
      this.isFocused = false;
      this.$emit('blur');
    },
    mouseEnterHandler(event: MouseEvent) {
      if (!event.target) return;
      this.allowDrag = !(event.target as HTMLElement).closest(
        '.ref-ChecklistBlockItem-content-editor',
      );
    },
    dragStart(event: DragEvent) {
      if (event.dataTransfer && this.allowDrag) {
        event.dataTransfer.setData(
          'checklist_item',
          JSON.stringify({
            title: this.entry.title,
            task: this.entry.task,
            checked: this.entry.checked,
            key: this.entry.key,
            checklist_block_id: this.resolvedBlock.id,
          }),
        );
      } else {
        event.preventDefault();
      }
    },
    rename(val: AssetPropValue) {
      this.dirtyValue = val;
      if (!this.dirtyValueError) {
        if (this.$refs.editor) {
          (
            this.$refs.editor as InstanceType<typeof ImcEditor>
          ).resetDirtyValue();
        }
        this.$emit('rename', val);
      }
    },
    check(val: boolean) {
      this.$emit('check', val);
    },
    async onFocusAt(ev: CustomEvent) {
      if (!this.$refs.editor) {
        await this.$nextTick();
        if (!this.$refs.editor) {
          return;
        }
      }
      (this.$refs.editor as InstanceType<typeof ImcEditor>).focusAt(
        ev.detail.clientX,
        ev.detail.clientY,
      );
    },
    async focus() {
      if (!this.$refs.editor) {
        await this.$nextTick();
        if (!this.$refs.editor) {
          return;
        }
      }
      (this.$refs.editor as InstanceType<typeof ImcEditor>).focus();
    },
    async focusEnd() {
      if (!this.$refs.editor) {
        await this.$nextTick();
        if (!this.$refs.editor) {
          return;
        }
      }
      (this.$refs.editor as InstanceType<typeof ImcEditor>).focusEnd();
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.ChecklistBlockItem {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 5px 2px;
  border-radius: 4px;
  position: relative;
  --ChecklistBlockItem-hover-bg: var(--local-hl-bg-color);
  cursor: grab;

  &.ChecklistBlockItem-active,
  &:hover {
    background-color: var(--ChecklistBlockItem-hover-bg);
  }

  &.state-drag-over.state-drag-what-checklist_item {
    &:before {
      content: '';
      position: absolute;
      top: -2px;
      left: 0;
      right: 0;
      height: 2px;
      background: #fff;
    }
  }
}

.ChecklistBlockItem-content {
  flex: 1;
  width: 100%;
}

.ChecklistBlockItem-presenter {
  &.state-inherited {
    color: var(--color-inherited-value);
  }
}

.ChecklistBlockItem-check {
  width: 18px;
  margin-right: 8px;
  margin-top: 4px;
}

.ChecklistBlockItem-check-input {
  font-size: 24px;
  line-height: 24px;
  cursor: pointer;
  color: #ccc;

  &:hover {
    color: var(--color-ready-value);
  }

  &.ri-checkbox-line {
    color: var(--color-ready-value);

    &:hover {
      color: #ccc;
    }
  }
}

.ChecklistBlock-content-item-title {
  display: flex;
  align-items: center;
  gap: 7px;
}

.ChecklistBlockItem-loading {
  margin: 0;
  position: relative;
  top: 0px;
  left: 1px;
  font-size: 14px;
}

.ChecklistBlockItem.state-editMode:hover {
  .ChecklistBlockItem-presenter {
    color: #999;
  }
}

.ChecklistBlockItem.state-error {
  color: var(--color-main-error);
}

.ChecklistBlockItem-dirtyValueError {
  position: absolute;
  top: 7px;
  left: 5px;
}

.ChecklistBlockItem.state-complete .ChecklistBlockItem-content {
  text-decoration: line-through;
}
</style>

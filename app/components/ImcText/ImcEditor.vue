<template>
  <div
    class="ImcEditor"
    :class="{ 'state-drag': dragEffect === 1 }"
    @drop="onDrop"
    @dragover="_onDragOver"
    @dragleave="_onDragLeave"
  >
    <div class="ImcEditor-dropZone">
      <div v-show="!hidePresenter" class="ImcEditor-presenter-wrapper">
        <input
          v-if="!activated"
          class="ImcEditor-presenter-focusTrap"
          type="text"
          @focus="focus"
        />
        <imc-presenter
          ref="presenter"
          class="ImcEditor-presenter"
          :class="{ 'state-leaving': activatedReady }"
          :value="modelValue"
          :get-header-anchor="getHeaderAnchor"
          @click="_onPresenterClick"
          @view-ready="_onViewReady($event)"
        ></imc-presenter>
        <span
          v-if="!isFilledAssetPropValue(modelValue) && placeholder"
          class="ImcEditor-placeholder"
          @click="_onPresenterClick"
          >{{ placeholder }}</span
        >
      </div>
      <imc-editor-activated
        v-if="activated"
        ref="activatedEditor"
        class="ImcEditor-activated"
        :class="{ 'state-entering': activatedReady }"
        :model-value="modelValue"
        :readonly="readonly"
        :multiline="multiline"
        :toolbar="toolbar"
        :max-height="maxHeight"
        :allow-tab="allowTab"
        :placeholder="placeholder"
        :on-input-value="onInputValue"
        @update:model-value="$emit('update:modelValue', $event)"
        @focus="$emit('focus')"
        @blur="_onActivatedBlur"
        @enter="$emit('enter')"
        @pre-enter="$emit('preEnter')"
        @escape="$emit('escape')"
        @view-ready="_onViewReady($event)"
        @input-value="$emit('inputValue', $event)"
        @paste="$emit('paste', $event)"
      ></imc-editor-activated>
    </div>
    <div class="ImcEditor-drag-overlay"></div>
  </div>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent, type PropType } from 'vue';
import {
  type AssetPropValue,
  isFilledAssetPropValue,
} from '../../logic/types/Props';
import { isElementInteractive } from '../utils/DomElementUtils';
import type ImcEditorActivated from './ImcEditorActivated.vue';

export default defineComponent({
  name: 'ImcEditor',
  components: {
    ImcPresenter: defineAsyncComponent(() => import('./ImcPresenter.vue')),
    ImcEditorActivated: defineAsyncComponent(
      () => import('./ImcEditorActivated.vue'),
    ),
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    placeholder: { type: String, default: null },
    multiline: { type: Boolean, default: false },
    toolbar: {
      type: String as PropType<'default' | 'inline'>,
      default: 'default',
    },
    maxHeight: { type: Number, default: null },
    allowTab: { type: Boolean, default: true },
    onInputValue: {
      type: [Function, null] as PropType<
        ((val: AssetPropValue) => void) | null
      >,
      default: null,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    getHeaderAnchor: {
      type: Function as PropType<
        (title: string, level: number, index: number) => null | string
      >,
      default: null,
    },
  },
  emits: [
    'update:modelValue',
    'focus',
    'blur',
    'enter',
    'preEnter',
    'escape',
    'view-ready',
    'inputValue',
    'paste',
  ],
  data() {
    return {
      activated: false,
      activatedReady: false,
      hidePresenter: false,
      activatedReadyPromise: null as Promise<void> | null,
      activatedReadyResolve: null as (() => void) | null,
      pendingSelection: null as {
        anchorX: number;
        anchorY: number;
        focusX: number;
        focusY: number;
      } | null,
      dragEffect: 0,
      pendingDropFile: null as File | null,
    };
  },
  mounted() {
    if (this.$el) {
      this.$el.__imc_editor = this;
    }
  },
  beforeUnmount() {
    if (this.$el) {
      this.$el.__imc_editor = null;
    }
  },
  methods: {
    isFilledAssetPropValue,
    _onPresenterClick(ev: MouseEvent) {
      if (this.readonly) return;
      if (isElementInteractive(ev.target as HTMLElement)) return;
      this._captureSelection(ev);
      this._activate();
    },
    _captureSelection(ev: MouseEvent) {
      const sel = document.getSelection();
      if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const rects = range.getClientRects();
        if (rects.length > 0) {
          this.pendingSelection = {
            anchorX: rects[0].left,
            anchorY: rects[0].top,
            focusX: rects[rects.length - 1].right,
            focusY: rects[rects.length - 1].top,
          };
          return;
        }
      }
      this.pendingSelection = {
        anchorX: ev.clientX,
        anchorY: ev.clientY,
        focusX: ev.clientX,
        focusY: ev.clientY,
      };
    },
    async _activate() {
      if (this.activated) return;
      this.activated = true;
      this.activatedReadyPromise = new Promise((resolve) => {
        this.activatedReadyResolve = resolve;
      });
      await this.activatedReadyPromise;
    },
    _onViewReady(ev: any) {
      if (this.activatedReadyResolve) {
        this.activatedReadyResolve();
        this.activatedReadyResolve = null;
        this.activatedReady = true;
        this._restorePendingSelection();
        this._forwardPendingDrop();
        setTimeout(() => {
          this.hidePresenter = true;
        }, 200);
      }
      this.$emit('view-ready', ev);
    },
    _forwardPendingDrop() {
      if (this.pendingDropFile) {
        const file = this.pendingDropFile;
        this.pendingDropFile = null;
        this._forwardDropFile(file);
      }
    },
    _restorePendingSelection() {
      if (this.pendingSelection && this.$refs.activatedEditor) {
        const sel = this.pendingSelection;
        this.pendingSelection = null;
        this.$nextTick(() => {
          (
            this.$refs.activatedEditor as InstanceType<
              typeof ImcEditorActivated
            >
          ).restoreSelection(sel.anchorX, sel.anchorY, sel.focusX, sel.focusY);
        });
      }
    },
    _onActivatedBlur() {
      this.$emit('blur');
      this.deactivate();
    },
    async _ensureReady() {
      if (!this.activated) {
        await this._activate();
      } else if (this.activatedReadyPromise) {
        await this.activatedReadyPromise;
      }
    },
    async focus() {
      await this._ensureReady();
      if (this.$refs.activatedEditor) {
        await (this.$refs.activatedEditor as any).focus();
      }
    },
    async focusEnd() {
      await this._ensureReady();
      if (this.$refs.activatedEditor) {
        await (this.$refs.activatedEditor as any).focusEnd();
      }
    },
    async focusAt(clientX: number, clientY: number) {
      this.pendingSelection = null;
      await this._ensureReady();
      if (this.$refs.activatedEditor) {
        await (this.$refs.activatedEditor as any).focusAt(clientX, clientY);
      }
    },
    async selectAll() {
      await this._ensureReady();
      if (this.$refs.activatedEditor) {
        await (this.$refs.activatedEditor as any).selectAll();
      }
    },
    emitDirty() {
      if (this.$refs.activatedEditor) {
        return (this.$refs.activatedEditor as any).emitDirty();
      }
      return false;
    },
    isFocused() {
      if (this.$refs.activatedEditor) {
        return (this.$refs.activatedEditor as any).isFocused();
      }
      return false;
    },
    resetDirtyValue() {
      if (this.$refs.activatedEditor) {
        (this.$refs.activatedEditor as any).resetDirtyValue();
      }
    },
    async onDrop(ev: DragEvent) {
      const isFileMove =
        ev.dataTransfer && ev.dataTransfer.types.includes('Files');
      this.dragEffect = 0;
      if (!isFileMove) return;
      ev.preventDefault();
      const file = ev.dataTransfer?.files[0];
      if (!file) return;
      if (!this.activated) {
        this.pendingDropFile = file;
        await this._activate();
      } else {
        this._forwardDropFile(file);
      }
    },
    _forwardDropFile(file: File) {
      if (this.$refs.activatedEditor) {
        (this.$refs.activatedEditor as any).handleFile(file);
      }
    },
    _onDragOver(ev: DragEvent) {
      const isFileMove =
        ev.dataTransfer && ev.dataTransfer.types.includes('Files');
      this.dragEffect = isFileMove ? 1 : 0;
      if (isFileMove) {
        ev.preventDefault();
      }
    },
    _onDragLeave(ev: DragEvent) {
      if (!this.$el.contains(ev.relatedTarget as Node)) {
        this.dragEffect = 0;
      }
    },
    async deactivate() {
      this.activated = false;
      this.activatedReady = false;
      this.hidePresenter = false;
      this.pendingSelection = null;
      this.activatedReadyPromise = null;
      this.activatedReadyResolve = null;
      this.pendingDropFile = null;
    },
    getSelection(): { index: number; length: number } | null {
      const activatedEditor = this.$refs['activatedEditor'] as InstanceType<
        typeof ImcEditorActivated
      > | null;
      if (!activatedEditor) return null;
      if (!activatedEditor.quillController.quill) return null;
      return activatedEditor.quillController.quill.getSelection();
    },
  },
});
</script>

<style lang="scss" scoped>
.ImcEditor {
  display: grid;
  position: relative;
}
.ImcEditor-dropZone {
  display: grid;
  grid-column: 1;
  grid-row: 1;
}
.ImcEditor-presenter-wrapper,
.ImcEditor-activated {
  grid-column: 1;
  grid-row: 1;
}
.ImcEditor-presenter-wrapper {
  position: relative;
}
.ImcEditor-presenter {
  opacity: 1;
  transition: opacity 0.05s ease;
  pointer-events: auto;
  &.state-leaving {
    opacity: 0;
    pointer-events: none;
  }
}
.ImcEditor-placeholder {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: auto;
  color: var(--color-placeholder);
  font-style: italic;
}
.ImcEditor-activated {
  opacity: 0;
  transition: opacity 0.05s ease;
  pointer-events: none;
  &.state-entering {
    opacity: 1;
    pointer-events: auto;
  }
}
.ImcEditor.state-drag .ImcEditor-drag-overlay {
  display: block;
}
.ImcEditor-drag-overlay {
  display: none;
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(238, 216, 17, 0.02);
  z-index: 100;
  grid-column: 1;
  grid-row: 1;
}
.ImcEditor-presenter-focusTrap {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  opacity: 0;
}
</style>

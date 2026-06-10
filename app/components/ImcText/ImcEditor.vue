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
          @focus="focus()"
        />
        <imc-presenter
          ref="presenter"
          class="ImcEditor-presenter"
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
    <div
      v-if="cursorIndicator"
      class="ImcEditor-cursor-indicator"
      :style="{
        left: cursorIndicator.x + 'px',
        top: cursorIndicator.y + 'px',
        height: cursorIndicator.height + 'px',
      }"
    ></div>
  </div>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent, type PropType } from 'vue';
import {
  type AssetPropValue,
  isFilledAssetPropValue,
} from '../../logic/types/Props';
import {
  isElementInteractive,
  isSelectionInsideNode,
} from '../utils/DomElementUtils';
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
      pendingDropCoords: null as { x: number; y: number } | null,
      cursorIndicator: null as { x: number; y: number; height: number } | null,
      cursorIndicatorRAF: null as number | null,
      activateEpoch: 0,
    };
  },
  async mounted() {
    if (this.$el) {
      this.$el.__imc_editor = this;
    }
  },
  beforeUnmount() {
    if (this.cursorIndicatorRAF) {
      cancelAnimationFrame(this.cursorIndicatorRAF);
    }
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
    _captureSelection(ev?: MouseEvent) {
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
      if (ev) {
        this.pendingSelection = {
          anchorX: ev.clientX,
          anchorY: ev.clientY,
          focusX: ev.clientX,
          focusY: ev.clientY,
        };
      }
    },
    async _activate() {
      if (this.activated) return;
      this.activateEpoch++;
      this.activated = true;
      this.activatedReadyPromise = new Promise((resolve) => {
        this.activatedReadyResolve = resolve;
      });
      await this.activatedReadyPromise;
    },
    async _onViewReady(ev: any) {
      if (this.activatedReadyResolve) {
        const epoch = this.activateEpoch;
        this.activatedReadyResolve();
        this.activatedReadyResolve = null;
        this.activatedReady = true;
        this._restorePendingSelection();
        await this._forwardPendingDrop();
        if (this.activated && this.activateEpoch === epoch) {
          setTimeout(() => {
            if (this.activated && this.activateEpoch === epoch) {
              this.hidePresenter = true;
            }
          }, 1);
        }
      }
      this.$emit('view-ready', ev);
    },
    async _forwardPendingDrop() {
      if (this.pendingDropFile) {
        const file = this.pendingDropFile;
        const coords = this.pendingDropCoords;
        this.pendingDropFile = null;
        this.pendingDropCoords = null;
        await this._forwardDropFile(file, coords?.x, coords?.y);
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
    async focus(options?: { preventScroll?: boolean }) {
      if (!this.activatedReady) {
        const selection_inside = this.$el && isSelectionInsideNode(this.$el);
        if (selection_inside) {
          this._captureSelection();
          await this._activate();
          return;
        }
      }
      await this._ensureReady();
      const editor = this.$refs.activatedEditor as InstanceType<
        typeof ImcEditorActivated
      > | null;
      if (editor && !editor.isFocused()) {
        await editor.focus(options);
      }
    },
    async focusEnd() {
      await this._ensureReady();
      const editor = this.$refs.activatedEditor as InstanceType<
        typeof ImcEditorActivated
      > | null;
      if (editor) {
        await editor.focusEnd();
      }
    },
    async focusAt(clientX: number, clientY: number) {
      this.pendingSelection = null;
      await this._ensureReady();
      const editor = this.$refs.activatedEditor as InstanceType<
        typeof ImcEditorActivated
      > | null;
      if (editor) {
        await editor.focusAt(clientX, clientY);
      }
    },
    async selectAll() {
      await this._ensureReady();
      const editor = this.$refs.activatedEditor as InstanceType<
        typeof ImcEditorActivated
      > | null;
      if (editor) {
        await editor.selectAll();
      }
    },
    emitDirty() {
      const editor = this.$refs.activatedEditor as InstanceType<
        typeof ImcEditorActivated
      > | null;
      if (editor) {
        return editor.emitDirty();
      }
      return false;
    },
    isFocused() {
      const editor = this.$refs.activatedEditor as InstanceType<
        typeof ImcEditorActivated
      > | null;
      if (editor) {
        return editor.isFocused();
      }
      return false;
    },
    resetDirtyValue() {
      const editor = this.$refs.activatedEditor as InstanceType<
        typeof ImcEditorActivated
      > | null;
      if (editor) {
        editor.resetDirtyValue();
      }
    },
    async onDrop(ev: DragEvent) {
      const isFileMove =
        ev.dataTransfer && ev.dataTransfer.types.includes('Files');
      this.dragEffect = 0;
      this.cursorIndicator = null;
      if (!isFileMove) return;
      ev.preventDefault();
      const file = ev.dataTransfer?.files[0];
      if (!file) return;
      this.pendingSelection = null;
      this.pendingDropCoords = { x: ev.clientX, y: ev.clientY };
      if (!this.activated) {
        this.pendingDropFile = file;
        await this._activate();
      } else {
        await this._forwardDropFile(file, ev.clientX, ev.clientY);
      }
    },
    async _forwardDropFile(file: File, clientX?: number, clientY?: number) {
      const editor = this.$refs.activatedEditor as InstanceType<
        typeof ImcEditorActivated
      > | null;
      if (!editor) return;
      if (clientX !== undefined && clientY !== undefined) {
        await editor.focusAt(clientX, clientY);
      }
      editor.handleFile(file);
    },
    _updateCursorIndicator(clientX: number, clientY: number) {
      if (this.cursorIndicatorRAF) {
        cancelAnimationFrame(this.cursorIndicatorRAF);
      }
      this.cursorIndicatorRAF = requestAnimationFrame(() => {
        this.cursorIndicatorRAF = null;
        const editorRect = this.$el?.getBoundingClientRect();
        if (!editorRect) return;
        const pos =
          (document as any).caretPositionFromPoint?.(clientX, clientY) ??
          (document as any).caretRangeFromPoint?.(clientX, clientY);
        let node: Node | null = null;
        let offset = 0;
        if (pos) {
          node =
            (pos as CaretPosition).offsetNode ?? (pos as Range).startContainer;
          offset = (pos as CaretPosition).offset ?? (pos as Range).startOffset;
        }
        if (!node) return;
        try {
          const range = document.createRange();
          range.setStart(node, offset);
          range.setEnd(node, offset);
          const rect = range.getClientRects()[0];
          if (rect) {
            this.cursorIndicator = {
              x: rect.left - editorRect.left,
              y: rect.top - editorRect.top,
              height: rect.height,
            };
          }
        } catch {
          // ignore errors for readonly ranges
        }
      });
    },
    _onDragOver(ev: DragEvent) {
      const isFileMove =
        ev.dataTransfer && ev.dataTransfer.types.includes('Files');
      this.dragEffect = isFileMove ? 1 : 0;
      if (isFileMove) {
        ev.preventDefault();
        this._updateCursorIndicator(ev.clientX, ev.clientY);
      }
    },
    _onDragLeave(ev: DragEvent) {
      if (!this.$el.contains(ev.relatedTarget as Node)) {
        this.dragEffect = 0;
        this.cursorIndicator = null;
      }
    },
    async deactivate() {
      if (this.cursorIndicatorRAF) {
        cancelAnimationFrame(this.cursorIndicatorRAF);
        this.cursorIndicatorRAF = null;
      }
      this.activated = false;
      this.activatedReady = false;
      this.hidePresenter = false;
      this.pendingSelection = null;
      this.activatedReadyPromise = null;
      this.activatedReadyResolve = null;
      this.pendingDropFile = null;
      this.pendingDropCoords = null;
      this.cursorIndicator = null;
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
.ImcEditor-placeholder {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: auto;
  color: var(--color-placeholder);
  font-style: italic;
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
  pointer-events: none;
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
.ImcEditor-cursor-indicator {
  position: absolute;
  width: 2px;
  background: var(--local-text-color);
  z-index: 200;
  pointer-events: none;
  animation: imc-cursor-blink 1s step-end infinite;
}
@keyframes imc-cursor-blink {
  50% {
    opacity: 0;
  }
}
</style>

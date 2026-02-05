<template>
  <div
    ref="imcTextFileWrapper"
    class="ImcTextFile-wrapper"
    @dragstart="preventDrag($event)"
    @click.prevent="handleClick()"
  >
    <file-presenter
      class="ImcTextFile is-interactive"
      :class="{ 'state-selected': !file.inline && borderActive }"
      :value="file.value"
      :inline="file.inline"
      :is-static="isEditor"
      :width="fileDimensions.width ?? undefined"
      :height="fileDimensions.height ?? undefined"
      @click="fileClick"
    >
    </file-presenter>
    <div
      v-if="isEditor && borderActive && file.inline"
      class="ImcTextFile-border"
    >
      <div class="ImcTextFile-border-left" @dblclick="resetSize()"></div>
      <div class="ImcTextFile-border-top" @dblclick="resetSize()"></div>
      <div
        class="ImcTextFile-border-right"
        :class="{ captured: capturedRight }"
        @dblclick="resetSize()"
        @mousedown="capture('right')"
      ></div>
      <div
        class="ImcTextFile-border-bottom"
        :class="{ captured: capturedBottom }"
        @dblclick="resetSize()"
        @mousedown="capture('bottom')"
      ></div>
      <div class="ImcTextFile-border-control" @dblclick="resetSize()">
        <div
          class="ImcTextFile-border-control-bottom-right"
          :class="{ captured: capturedBottomRight }"
          @dblclick="resetSize()"
          @mousedown="capture('bottom-right')"
        ></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import FilePresenter from '../File/FilePresenter.vue';
import type { ImcFileBlotData } from '../ImcText/blots/ImcFileBlot';
import './quill-init';
import { IMC_FILE_BLOT_CLASS } from './blots/ImcFileBlot';
import DialogManager from '../../logic/managers/DialogManager';
import FilePresenterDialog from '../File/FilePresenterDialog.vue';
import type { AssetPropValueFile } from '../../logic/types/Props';
import { useFilePresenterParams } from '../File/FilePresenter';

export default defineComponent({
  name: 'ImcTextFile',
  components: {
    FilePresenter,
  },
  props: {
    file: {
      type: Object as PropType<ImcFileBlotData>,
      required: true,
    },
    isEditor: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      borderActive: false,
      minHeight: 10,
      minWidth: 10,
      fileDimensions: {
        width: this.file.width ?? null,
        height: this.file.height ?? null,
      },
      isCaptured: false,
      capturedRight: false,
      capturedBottom: false,
      capturedBottomRight: false,
      aspectRatio: 1,
    };
  },
  computed: {
    fileInfo() {
      return this.file ? useFilePresenterParams(this.file.value) : null;
    },
  },
  watch: {
    isEditor() {
      this.resetEditor(this.isEditor);
    },
  },
  mounted() {
    if (this.isEditor) {
      this.resetEditor(true);
    }
  },
  unmounted() {
    this.resetEditor(false);
  },
  methods: {
    async fileClick(ev: MouseEvent) {
      if (!this.isEditor) {
        if (this.file.href) {
          if (ev.ctrlKey || ev.metaKey) {
            ev.preventDefault();
            window.open(this.file.href, '_blank');
            return;
          }
          ev.preventDefault();
          window.location.assign(this.file.href);
          return;
        }

        if (!this.file.value) return;
        if (!this.fileInfo?.inlineType) return;

        const current_file_content_id =
          this.getHtmlElementParent()?.dataset.contentId;
        const same_content_id_files: AssetPropValueFile[] = [];
        if (current_file_content_id) {
          const same_content_id_file_elements = document.querySelectorAll(
            `[data-content-id="${current_file_content_id}"]`,
          );

          same_content_id_file_elements.forEach((el) => {
            const element_dataset = (el as HTMLElement).dataset;
            same_content_id_files.push({
              FileId: element_dataset.fileId ?? '',
              Title: element_dataset.title ?? '',
              Size: parseInt(element_dataset.size ?? '0'),
              Dir: element_dataset.dir ?? null,
              Store: element_dataset.store ?? '',
            });
          });
        }

        this.$getAppManager().get(DialogManager).show(FilePresenterDialog, {
          value: this.file.value,
          files: same_content_id_files,
        });
        ev.preventDefault();
      }
    },
    getHtmlElement() {
      const element = this.$refs.imcTextFileWrapper as HTMLElement;
      if (!element) return;
      return element;
    },
    getHtmlElementParent() {
      return this.getHtmlElement()?.closest(
        `.${IMC_FILE_BLOT_CLASS}`,
      ) as HTMLElement | null;
    },
    getHtmlElementRect() {
      const element = this.getHtmlElement();
      if (!element) return;
      return element.getBoundingClientRect();
    },
    updateDimensions(
      new_width: number,
      new_height: number,
      elementParent: HTMLElement,
    ) {
      new_width = Math.round(new_width);
      new_height = Math.round(new_height);
      this.fileDimensions.width = new_width;
      this.fileDimensions.height = new_height;
      elementParent.dataset.width = new_width.toString();
      elementParent.dataset.height = new_height.toString();
    },
    handleRightResize(
      evt: MouseEvent,
      element_rect: DOMRect,
      elementParent: HTMLElement,
    ) {
      let new_width: number = evt.pageX - element_rect.left;
      let new_height = this.fileDimensions.height ?? element_rect.height;

      new_height = Math.max(new_height, this.minHeight);
      new_width = Math.max(new_width, this.minWidth);
      this.updateDimensions(new_width, new_height, elementParent);
    },
    handleBottomResize(
      evt: MouseEvent,
      element_rect: DOMRect,
      elementParent: HTMLElement,
    ) {
      let new_height: number = evt.pageY - element_rect.top;
      let new_width = this.fileDimensions.width ?? element_rect.width;

      new_height = Math.max(new_height, this.minHeight);
      new_width = Math.max(new_width, this.minWidth);
      this.updateDimensions(new_width, new_height, elementParent);
    },
    handleBottomRightResize(
      evt: MouseEvent,
      element_rect: DOMRect,
      altKey: boolean,
      elementParent: HTMLSpanElement,
    ) {
      let new_width: number = evt.pageX - element_rect.left;
      let new_height: number = evt.pageY - element_rect.top;

      if (!altKey) {
        new_height = new_width / this.aspectRatio;
      }

      new_height = Math.max(new_height, this.minHeight);
      new_width = Math.max(new_width, this.minWidth);

      this.updateDimensions(new_width, new_height, elementParent);
    },
    capture(direction: 'right' | 'bottom' | 'bottom-right') {
      if (this.isCaptured) return;

      this.isCaptured = true;

      {
        const element = this.getHtmlElement();
        if (!element) return;
        const element_rect = element.getBoundingClientRect();
        this.aspectRatio = element_rect.width / element_rect.height;
      }

      (this as any)._globalMouseMoveHandler = (evt: MouseEvent) => {
        const element = this.getHtmlElement();
        const elementParent = this.getHtmlElementParent();
        if (!element || !elementParent) return;
        const element_rect = element.getBoundingClientRect();

        const altKey = evt.altKey;

        switch (direction) {
          case 'right': {
            this.capturedRight = true;
            this.handleRightResize(evt, element_rect, elementParent);
            break;
          }
          case 'bottom': {
            this.capturedBottom = true;
            this.handleBottomResize(evt, element_rect, elementParent);
            break;
          }
          case 'bottom-right': {
            this.capturedBottomRight = true;
            this.handleBottomRightResize(
              evt,
              element_rect,
              altKey,
              elementParent,
            );
            break;
          }
        }
      };
      (this as any)._globalMouseUpHandler = (_e: MouseEvent) => {
        this.release();
      };
      window.addEventListener(
        'mousemove',
        (this as any)._globalMouseMoveHandler,
        { passive: true },
      );
      window.addEventListener(
        'mouseup',
        (this as any)._globalMouseUpHandler,
        false,
      );
    },
    release() {
      setTimeout(() => {
        this.isCaptured = false;
      }, 1);
      this.capturedBottomRight = false;
      this.capturedRight = false;
      this.capturedBottom = false;
      if ((this as any)._globalMouseMoveHandler) {
        window.removeEventListener(
          'mousemove',
          (this as any)._globalMouseMoveHandler,
        );
        (this as any)._globalMouseMoveHandler = null;
      }
      if ((this as any)._globalMouseUpHandler) {
        window.removeEventListener(
          'mouseup',
          (this as any)._globalMouseUpHandler,
          false,
        );
        (this as any)._globalMouseUpHandler = null;
      }
    },
    resetSize() {
      const elementParent = this.getHtmlElementParent();
      if (!elementParent) return;

      this.fileDimensions.width = null;
      this.fileDimensions.height = null;
      elementParent.dataset.height = `${null}`;
      elementParent.dataset.width = `${null}`;
    },
    preventDrag(evt: MouseEvent) {
      if (this.isCaptured) {
        evt.preventDefault();
      }
    },
    handleClick() {
      const elementParent = this.getHtmlElementParent();
      if (!elementParent) return;

      const range = document.createRange();
      range.selectNode(elementParent);
      const selection = window.getSelection();
      if (selection) {
        selection.empty();
        selection.addRange(range);
      }
    },
    resetEditor(restart: boolean) {
      if ((this as any)._selectionChange) {
        document.removeEventListener(
          'selectionchange',
          (this as any)._selectionChange,
        );
        (this as any)._selectionChange = null;
      }
      this.release();
      if (restart) {
        (this as any)._selectionChange = () => {
          const selection = document.getSelection();
          if (!selection) return;
          const elementParent = this.getHtmlElementParent();
          if (!elementParent) return;
          this.borderActive = selection.containsNode(this.$el);
        };
        document.addEventListener(
          'selectionchange',
          (this as any)._selectionChange,
        );
      }
    },
  },
});
</script>

<style lang="scss" scoped>
$resize-border-size: 2px;
$resize-border-control-size: 8px;

.ImcTextFile {
  max-width: 100%;
  display: block;
  border-radius: var(--panel-border-radius);
}
.ImcTextFile-wrapper {
  position: relative;
  user-select: none;
}

.ImcTextFile-border {
  &-right,
  &-left,
  &-bottom,
  &-top {
    position: absolute;
    background-color: var(--color-main-yellow);
  }

  &-top,
  &-bottom {
    height: $resize-border-size;
    width: 100%;
  }

  &-bottom {
    cursor: ns-resize;

    &:hover,
    &.captured {
      height: 2.5 * $resize-border-size;
    }
  }

  &-right,
  &-left {
    top: 0;
    height: 100%;
    width: $resize-border-size;
  }
  &-right {
    cursor: ew-resize;

    &:hover,
    &.captured {
      width: 2.5 * $resize-border-size;
    }
  }

  &-left {
    left: 0;
  }

  &-right {
    right: 0;
  }

  &-bottom {
    bottom: 0;
  }

  &-top {
    top: 0;
  }

  &-control {
    &-top-left,
    &-top-right,
    &-bottom-right,
    &-bottom-left {
      position: absolute;
      background-color: var(--color-main-yellow);
      height: $resize-border-control-size;
      width: $resize-border-control-size;
      border-radius: 30%;
    }

    &-top-left,
    &-top-right {
      top: 0;
    }
    &-bottom-left,
    &-bottom-right {
      bottom: 0;
    }

    &-top-left,
    &-bottom-left {
      left: 0;
    }

    &-top-right,
    &-bottom-right {
      right: 0;
    }
    &-bottom-right {
      cursor: se-resize;

      &:hover,
      &.captured {
        width: 1.8 * $resize-border-control-size;
        height: 1.8 * $resize-border-control-size;
      }
    }
  }
}
</style>

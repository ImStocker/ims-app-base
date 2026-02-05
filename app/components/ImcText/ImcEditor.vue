<template>
  <div
    v-logical-focus-out="onBlurEditorElement"
    class="ImcEditor notranslate"
    :class="{
      'state-drag': dragEffect === 1,
      ['type-toolbar-' + toolbar]: true,
    }"
  >
    <div
      class="ImcEditor-dropZone"
      @drop="dropFile"
      @dragover="dragFileEnter"
      @dragleave="dragFileLeave"
    >
      <div
        v-if="!editorInited"
        class="ImcEditor-editor state-sleep"
        v-html="staticHTML"
      ></div>
      <imc-text-augmentation ref="aug" :is-editor="true">
        <div
          ref="editor"
          class="ImcEditor-editor"
          @vue:mounted="editorMounted"
        ></div>
      </imc-text-augmentation>
      <div class="ImcEditor-drag-overlay"></div>
    </div>
    <div
      v-if="quillController.quill && toolbarCoord"
      class="ImcEditor-toolbar-target"
      :style="{
        left: `${toolbarCoord.x}px`,
        top: `${toolbarCoord.y - toolbarOffset}px`,
        width: `${toolbarCoord.width}px`,
        height: `${toolbarCoord.height + toolbarOffset * 2}px`,
      }"
    >
      <dropdown-container
        attach-position="top"
        align-position="center"
        class="ImcEditor-toolbar-container"
      >
        <imc-editor-toolbar
          class="ImcEditor-toolbar-widget"
          :quill="quillController.quill"
          :project="projectInfo"
        ></imc-editor-toolbar
      ></dropdown-container>
    </div>
    <div
      v-if="autocomplete.shown && quillController.quill && projectInfo"
      class="ImcEditor-autocomplete-target"
      :style="{
        left: `${autocomplete.x}px`,
        top: `${autocomplete.y}px`,
        height: `${autocomplete.height}px`,
      }"
    >
      <dropdown-container
        ref="dropdownContainer"
        class="ImcEditor-autocomplete ql-ImcEditor-autocomplete"
      >
        <imc-editor-autocomplete
          ref="dropdown"
          :project="projectInfo"
          :options="autocomplete.options"
          :has-more="autocomplete.hasMore"
          :loading="autocomplete.loading"
          :error="autocomplete.error ?? undefined"
          :search-text="autocomplete.searchText"
          :quill="quillController.quill"
        ></imc-editor-autocomplete>
      </dropdown-container>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineAsyncComponent,
  defineComponent,
  type PropType,
  shallowRef,
} from 'vue';
import type { ImcLinkDrowdownInterface, ImcLinkOption } from './ImcLinksModule';
import type ImcEditorAutocomplete from './ImcEditorAutocomplete.vue';
import {
  type AssetPropValue,
  sameAssetPropValues,
} from '../../logic/types/Props';
import {
  packQuillDeltaToPropValue,
  unpackQuillDeltaFromPropValue,
} from './ImcContent';
import {
  getRangeUnderMouse,
  getScrollParentNode,
  nodeContainsElement,
} from '../utils/DomElementUtils';
import UiManager, {
  type UiFocusLockHandler,
} from '../../logic/managers/UiManager';
import ProjectManager from '../../logic/managers/ProjectManager';
import type Delta from 'quill-delta';
import DropdownContainer from '../Common/DropdownContainer.vue';
import { useImcHTMLRenderer } from './useImcHTMLRenderer';
import { ImcEditorQuillController } from './ImcEditorQuillController';
import { quillDeltaSame } from './utils';
import type ImcTextAugmentation from './ImcTextAugmentation.vue';
import ImcEditorToolbar from './Toolbar/ImcEditorToolbar.vue';
import {
  checkAndroidBrowser,
  checkIOSBrowser,
  checkYandexBrowser,
} from '../utils/browser';
import { setImsClickOutside, type SetClickOutsideCancel } from '../utils/ui';

const BASE_TOOLBAR_OFFSET = 10;

export default defineComponent({
  name: 'ImcEditor',
  components: {
    ImcEditorAutocomplete: defineAsyncComponent(
      () => import('./ImcEditorAutocomplete.vue'),
    ),
    DropdownContainer,
    ImcTextAugmentation: defineAsyncComponent(
      () => import('./ImcTextAugmentation.vue'),
    ),
    ImcEditorToolbar,
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
  ],
  data() {
    return {
      autocomplete: {
        shown: false,
        options: [] as ImcLinkOption[],
        hasMore: false,
        loading: false,
        error: null as string | null,
        searchText: '',
        x: 0,
        y: 0,
        height: 0,
      },
      dirtyValue: undefined as Delta | undefined,
      dragEffect: 0,
      quillController: shallowRef(new ImcEditorQuillController(this as any)),
      editorInited: false,
      focusLock: shallowRef(null as UiFocusLockHandler | null),
      clickOutside: null as SetClickOutsideCancel | null,
      toolbarCoord: null as null | DOMRect,
      toolbarOffset: BASE_TOOLBAR_OFFSET,
    };
  },
  computed: {
    unpackedModelValue(): Delta {
      return unpackQuillDeltaFromPropValue(this.modelValue);
    },
    quillContent(): Delta {
      if (this.dirtyValue !== undefined) {
        return this.dirtyValue;
      }
      return this.unpackedModelValue;
    },
    dropdownInterface(): ImcLinkDrowdownInterface {
      return {
        setShown: (val) => {
          this.autocomplete.shown = val;
        },
        setOptions: (options: ImcLinkOption[], hasMore: boolean) => {
          this.autocomplete.options = options;
          this.autocomplete.hasMore = hasMore;
        },
        setSearchText: (val: string) => {
          this.autocomplete.searchText = val;
        },
        setLoading: (state: boolean, error: string | null) => {
          this.autocomplete.loading = state;
          this.autocomplete.error = error;
        },
        setTextBounds: (x: number, y: number, height: number) => {
          this.autocomplete.x = x;
          this.autocomplete.y = y;
          this.autocomplete.height = height + 10;
          if (this.$refs.dropdownContainer) {
            (this.$refs.dropdownContainer as any).updateDropdownPosition();
          }
        },
        handleKey: (key: string) => {
          if (!this.$refs.dropdown) return true;
          return (
            this.$refs.dropdown as InstanceType<typeof ImcEditorAutocomplete>
          ).handleKey(key);
        },
        selectCurrent: () => {
          if (!this.$refs.dropdown) return;
          (
            this.$refs.dropdown as InstanceType<typeof ImcEditorAutocomplete>
          ).selectCurrent();
        },
      };
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    staticHTML() {
      const project = this.$getAppManager()
        .get(ProjectManager)
        .getProjectInfo();
      return useImcHTMLRenderer()(this.modelValue, {
        project: project ?? undefined,
      });
    },
  },
  watch: {
    unpackedModelValue(new_val, old_val) {
      if (quillDeltaSame(new_val, old_val)) {
        return;
      }

      if (
        !this.dirtyValue ||
        (this.dirtyValue && !quillDeltaSame(new_val, this.dirtyValue))
      ) {
        this.quillController.setContentSilently(this.unpackedModelValue);
        this.onTextChange(this.unpackedModelValue);
      }
    },
  },
  async mounted() {
    await this.quillController.init();
    this.editorInited = true;
    if (this.$el) {
      this.$el.__imc_editor = this;
    }
    this.$emit('view-ready');
    this.updateTextAugmentation();
    if (checkYandexBrowser()) {
      this.toolbarOffset = BASE_TOOLBAR_OFFSET + 25;
    } else if (checkAndroidBrowser() || checkIOSBrowser()) {
      this.toolbarOffset = BASE_TOOLBAR_OFFSET + 60;
    }
  },
  beforeUnmount() {
    if (this.$el) {
      this.$el.__imc_editor = null;
    }
    if (this.focusLock) {
      this.focusLock.cancel();
      this.focusLock = null;
    }
  },
  unmounted() {
    this.resetGlobalClickOutside(false);
    this.quillController.destroy();
  },
  methods: {
    async editorMounted() {
      const refsEditor = this.$refs.editor as HTMLElement;
      if (!refsEditor) return;
      this.quillController.onEditorElementMounted(refsEditor);
    },
    emitValue(val: Delta): boolean {
      const emiting_value = packQuillDeltaToPropValue(val);
      if (!sameAssetPropValues(emiting_value, this.modelValue)) {
        this.$emit('update:modelValue', emiting_value);
        return true;
      } else return false;
    },
    isFocused() {
      return !!this.focusLock;
    },
    emitDirty() {
      if (this.dirtyValue !== undefined) {
        return this.emitValue(this.dirtyValue);
      } else return false;
    },
    onBlurEditorElement(_e: FocusEvent) {
      this.emitDirty();
      if (
        !this.quillController.shouldBeFocused() &&
        window.document.activeElement &&
        window.document.activeElement !== document.body
      ) {
        this.onBlur();
      }
    },
    async onEnter() {
      this.$emit('preEnter');
      if (this.emitDirty()) {
        await this.$nextTick();
      }
      this.$emit('enter');
    },
    async onEscape() {
      this.$emit('escape');
    },
    async onBlur() {
      const lock = this.focusLock;
      this.focusLock = null;
      if (lock) await lock.unlock();
      this.toolbarCoord = null;
      this.resetGlobalClickOutside(false);
      this.$emit('blur');
    },
    async onFocus() {
      if (!this.focusLock) {
        this.focusLock = this.$getAppManager()
          .get(UiManager)
          .focusLock(async () => {
            if (this.emitDirty()) {
              await new Promise((res) => setTimeout(res, 1));
            }
          });
        this.resetGlobalClickOutside(true);
        this.$emit('focus');
      }
    },
    updateTextAugmentation() {
      if (this.$refs.aug) {
        (this.$refs.aug as InstanceType<typeof ImcTextAugmentation>).update();
      }
    },
    onTextChange(new_content: Delta) {
      const new_dirty = !quillDeltaSame(new_content, this.unpackedModelValue);
      if (
        (!this.dirtyValue && !new_dirty) ||
        (this.dirtyValue && quillDeltaSame(new_content, this.dirtyValue))
      ) {
        if (!this.dirtyValue && !new_dirty) {
          this.updateTextAugmentation();
        }
        return;
      }

      this.dirtyValue = new_dirty ? new_content : undefined;
      this.updateTextAugmentation();
      if (this.onInputValue as ((val: AssetPropValue) => void) | null) {
        const emiting_value =
          this.dirtyValue !== undefined
            ? packQuillDeltaToPropValue(this.dirtyValue)
            : this.modelValue;
        this.$emit('inputValue', emiting_value);
      }
    },
    async selectAll() {
      const quill = await this.quillController.awaitQuill();
      await this.focus();
      quill.setSelection(0, quill.getLength());
    },
    async focus() {
      const quill = await this.quillController.awaitQuill();
      quill.focus();
    },
    async focusEnd() {
      const quill = await this.quillController.awaitQuill();
      await this.focus();
      quill.setSelection(quill.getLength(), 0);
    },
    async focusAt(clientX: number, clientY: number) {
      const scroller = getScrollParentNode(this.$el);
      const scrolly =
        scroller instanceof Element ? scroller.scrollTop : window.scrollY;
      const scrollx =
        scroller instanceof Element ? scroller.scrollLeft : window.scrollX;
      await this.focus();
      if (scroller instanceof Element) {
        scroller.scrollTop = scrolly;
        scroller.scrollLeft = scrollx;
      } else window.scrollTo(scrollx, scrolly);
      if (clientX !== undefined && clientY !== undefined) {
        const { node, offset } = getRangeUnderMouse(clientX, clientY);

        const selection = document.getSelection();
        if (selection && node) {
          selection.setBaseAndExtent(node, offset, node, offset);
        }
      }
    },
    dropFile(ev: DragEvent) {
      const is_file_move =
        ev.dataTransfer && ev.dataTransfer.types.includes('Files');
      this.dragEffect = 0;
      if (is_file_move) {
        this.quillController.handleFile(ev);
        ev.preventDefault();
      }
    },
    dragFileEnter(ev: DragEvent) {
      const is_file_move =
        ev.dataTransfer && ev.dataTransfer.types.includes('Files');
      this.dragEffect = is_file_move ? 1 : 0;
      if (is_file_move) {
        ev.preventDefault();
      }
    },
    dragFileLeave(ev: DragEvent) {
      if (!nodeContainsElement(this.$el, ev.relatedTarget as Node)) {
        this.dragEffect = 0;
      }
    },
    resetDirtyValue() {
      this.quillController.setContentSilently(this.unpackedModelValue);
      this.onTextChange(this.unpackedModelValue);
    },
    resetGlobalClickOutside(restart: boolean) {
      if (this.clickOutside) {
        this.clickOutside();
        this.clickOutside = null;
      }
      if (restart && this.$el) {
        this.clickOutside = setImsClickOutside(this.$el, () => {
          setTimeout(() => {
            if (!this.quillController.shouldBeFocused()) {
              this.onBlur();
            }
          }, 1);
        });
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.ImcEditor {
  position: relative;
  &.state-drag-ok {
    border-color: var(--color-main-yellow);
  }
  &.state-drag-error {
    border-color: var(--color-main-error);
  }
}
.ImcEditor-autocomplete {
  z-index: 3000;
}
.ImcEditor.state-drag {
  .ImcEditor-drag-overlay {
    display: block;
  }
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
}
.ImcEditor-autocomplete-target,
.ImcEditor-toolbar-target {
  position: absolute;
  pointer-events: none;
}
</style>

<style lang="scss"></style>

<template>
  <component
    :is="activePresenter"
    v-bind="presenterProps"
    @view-ready="$emit('view-ready')"
  ></component>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import {
  AssetPropType,
  type AssetPropValue,
  castAssetPropValueToString,
  getAssetPropType,
} from '../../logic/types/Props';
import type { ProjectInfoForLink } from '../../logic/router/routes-helpers';
import ImcPresenter from '../ImcText/ImcPresenter.vue';
import ImcMarkdownPresenter from '../ImcMarkdownEditor/ImcMarkdownPresenter.vue';

export default defineComponent({
  name: 'ImcFormatTextPresenter',
  components: { ImcPresenter, ImcMarkdownPresenter },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean, null] as PropType<AssetPropValue>,
      default: null,
    },
    title: { type: String, default: null },
    clickToOpen: { type: Boolean, default: true },
    projectInfo: {
      type: Object as PropType<ProjectInfoForLink | null>,
      default: null,
    },
    getHeaderAnchor: {
      type: Function as PropType<
        (title: string, level: number, index: number) => null | string
      >,
      default: null,
    },
    contentId: {
      type: String,
      default: null,
    },
    blockId: {
      type: String,
      default: '',
    },
  },
  emits: ['view-ready'],
  computed: {
    isRichText(): boolean {
      return getAssetPropType(this.modelValue) === AssetPropType.TEXT;
    },
    activePresenter() {
      return this.isRichText ? ImcPresenter : ImcMarkdownPresenter;
    },
    markdownValue(): string {
      const v = this.modelValue;
      if (v === null || v === undefined) return '';
      if (typeof v === 'string') return v;
      if (typeof v === 'number' || typeof v === 'boolean') return String(v);
      return castAssetPropValueToString(v);
    },
    presenterProps(): Record<string, unknown> {
      if (this.isRichText) {
        return {
          value: this.modelValue,
          title: this.title,
          clickToOpen: this.clickToOpen,
          projectInfo: this.projectInfo,
          getHeaderAnchor: this.getHeaderAnchor,
          contentId: this.contentId,
        };
      }
      return {
        modelValue: this.markdownValue,
        blockId: this.blockId,
      };
    },
  },
});
</script>

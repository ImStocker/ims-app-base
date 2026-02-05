<template>
  <div class="ImcPresenter" :title="title">
    <imc-text-augmentation
      v-if="value !== null && value !== undefined"
      ref="aug"
      :click-to-open="clickToOpen"
      :project-info="projectInfo"
    >
      <div class="ImcPresenter-content" v-html="displayingHtml"></div>
    </imc-text-augmentation>
    <template v-else> &nbsp; </template>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineAsyncComponent, defineComponent } from 'vue';
import './quill-init';
import type { AssetPropValue } from '../../logic/types/Props';
import { unpackQuillDeltaFromPropValue } from './ImcContent';
import type { ProjectInfoForLink } from '../../logic/router/routes-helpers';
import type { Delta } from 'quill/core';
import { useImcHTMLRenderer } from './useImcHTMLRenderer';

export default defineComponent({
  name: 'ImcPresenter',
  components: {
    ImcTextAugmentation: defineAsyncComponent(
      () => import('./ImcTextAugmentation.vue') as any,
    ),
  },
  props: {
    value: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
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
  },
  emits: ['view-ready'],
  computed: {
    quillContent(): Delta {
      return unpackQuillDeltaFromPropValue(this.value);
    },
    displayingHtml(): string {
      return useImcHTMLRenderer()(this.value, {
        contentId: this.contentId,
        getHeaderAnchor: this.getHeaderAnchor,
        project: this.projectInfo ?? undefined,
      });
    },
  },
  watch: {
    displayingHtml() {
      this.$nextTick(() => {
        if (!this.$refs.aug) return;
        (this.$refs.aug as any).update();
      });
    },
  },
  mounted() {
    this.$emit('view-ready');
  },
});
</script>

<style lang="scss" scoped>
.ImcPresenter-content {
  white-space: pre-wrap;
}
.ImcPresenter-content:deep(p:last-child) {
  margin-bottom: 0;
}
</style>

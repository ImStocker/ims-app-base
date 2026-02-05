<template>
  <teleport v-if="targetEl" :to="targetEl">
    <div
      v-bind="$attrs"
      ref="inner"
      class="RightPanel"
      @vue:mounted="innerMounted()"
      @vue:beforeUnmount="innerBeforeUnmount"
    >
      <slot></slot>
    </div>
  </teleport>
</template>

<script lang="ts" type="text/ecmascript-6">
import { defineComponent } from 'vue';
import { assignLogicalParent } from '../utils/logical-tree';

export default defineComponent({
  name: 'RightPanel',
  inject: ['getRightPanel'],
  data() {
    return {
      originalParent: null as HTMLElement | null,
      targetEl: null as HTMLDivElement | null,
    };
  },
  mounted() {
    this.originalParent = this.$el.parentElement;
    this.targetEl = this.getRightPanel ? (this.getRightPanel as any)() : null; // Set after mounted to save originalParent
  },
  unmounted() {
    this.originalParent = null;
  },
  methods: {
    innerMounted() {
      if (this.$refs['inner']) {
        assignLogicalParent(
          this.$refs['inner'] as HTMLElement,
          this.originalParent,
        );
      }
    },
    innerBeforeUnmount() {
      if (this.$refs['inner']) {
        assignLogicalParent(this.$refs['inner'] as HTMLElement, null);
      }
    },
  },
});
</script>

<style lang="scss" scoped></style>

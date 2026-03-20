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

<style lang="scss" scoped>
.RightPanel {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 400px;
  background: var(--local-box-color);
  z-index: 200;
  box-shadow: 0px -10px 10px rgba(0, 0, 0, 0.2);
  padding: 20px 20px 20px;
  --local-bg-color: var(--local-box-color);
  overflow: auto;
}
</style>

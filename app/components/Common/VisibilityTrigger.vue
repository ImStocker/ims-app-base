<template>
  <div class="VisibilityTrigger" />
</template>

<script lang="ts" type="text/ecmascript-6">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'VisibilityTrigger',
  components: {},
  props: {
    threshold: { type: Number, default: 1.0 },
  },
  emits: ['trigger'],
  data() {
    return {
      observer: null as IntersectionObserver | null,
    };
  },
  watch: {
    threshold() {
      this.resetObserver(true);
    },
  },
  mounted() {
    this.resetObserver(true);
  },
  unmounted() {
    this.resetObserver(false);
  },
  methods: {
    resetObserver(init: boolean) {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      if (
        init &&
        this.$el &&
        typeof window.IntersectionObserver !== 'undefined'
      ) {
        const options = {
          threshold: this.threshold,
        };

        this.observer = new IntersectionObserver(
          (entry: IntersectionObserverEntry[]) => {
            this.$emit('trigger', !!entry[0] && entry[0].isIntersecting);
          },
          options,
        );
        this.observer.observe(this.$el);
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.VisibilityTrigger {
  height: 1px;
}
</style>

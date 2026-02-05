<template>
  <slot :target-bounding-box="targetBoundingBox" />
</template>

<script lang="ts" type="text/ecmascript-6">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { TrackElementBoundsHandler } from '../../logic/utils/trackElementBounds';
import { trackElementBounds } from '../../logic/utils/trackElementBounds';

export default defineComponent({
  name: 'TrackElementBounds',
  components: {},
  props: {
    target: {
      type: Object as PropType<HTMLElement | null>,
      default: null,
    },
  },
  data() {
    return {
      originalParent: null as HTMLElement | null,
      targetBoundingBox: null as DOMRect | null,
      tracker: null as TrackElementBoundsHandler | null,
    };
  },
  computed: {
    targetComp() {
      if (this.target) return this.target;
      else return this.originalParent;
    },
  },
  watch: {
    targetComp() {
      this.updateTarget();
    },
  },
  mounted() {
    this.originalParent = this.$el.parentElement;
    this.updateTarget();
  },
  beforeUnmount() {
    this.updateListeners(false);
    this.originalParent = null;
  },
  methods: {
    updateListeners(reset: boolean) {
      if (this.tracker) {
        this.tracker.cancel();
        this.tracker = null;
      }
      if (this.targetComp && reset) {
        this.tracker = trackElementBounds(this.targetComp, (bbox) => {
          this.targetBoundingBox = bbox;
        });
      }
    },
    updateTarget() {
      this.updateListeners(true);
    },
  },
});
</script>

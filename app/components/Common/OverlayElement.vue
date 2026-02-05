<template>
  <Teleport to="body">
    <div
      v-bind="$attrs"
      ref="inner"
      class="OverlayElement"
      :style="overlayStyle"
      @vue:mounted="innerMounted()"
      @vue:beforeUnmount="innerBeforeUnmount"
    >
      <slot :bounding-box="boundingBox"></slot>
    </div>
  </Teleport>
</template>

<script lang="ts" type="text/ecmascript-6">
import { type PropType, defineComponent } from 'vue';
import {
  trackElementBounds,
  type TrackElementBoundsHandler,
} from '../../logic/utils/trackElementBounds';
import { assignLogicalParent } from '../utils/logical-tree';

export default defineComponent({
  name: 'OverlayElement',
  components: {},
  props: {
    attachToElement: {
      type: Object as PropType<HTMLElement | null>,
      default: null,
    },
    attachPosition: {
      type: String as PropType<'left' | 'right' | 'top' | 'bottom'>,
      default: 'right',
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
      if (this.attachToElement) return this.attachToElement;
      else return this.originalParent;
    },
    boundingBox(): {
      left: number | null;
      top: number | null;
      right: number | null;
      bottom: number | null;
      width: number | null;
      height: number | null;
    } {
      if (this.targetBoundingBox) {
        if (this.attachPosition === 'left') {
          return {
            left: null,
            top: this.targetBoundingBox.top,
            right:
              window.document.documentElement.clientWidth -
              this.targetBoundingBox.left,
            bottom: window.innerHeight - this.targetBoundingBox.bottom,
            height: this.targetBoundingBox.height,
            width: null,
          };
        } else if (this.attachPosition === 'right') {
          return {
            left: this.targetBoundingBox.right,
            top: this.targetBoundingBox.top,
            right: null,
            bottom: window.innerHeight - this.targetBoundingBox.bottom,
            height: this.targetBoundingBox.height,
            width: null,
          };
        } else if (this.attachPosition === 'top') {
          return {
            left: this.targetBoundingBox.left,
            top: null,
            right:
              window.document.documentElement.clientWidth -
              this.targetBoundingBox.right,
            bottom: window.innerHeight - this.targetBoundingBox.top,
            height: null,
            width: this.targetBoundingBox.width,
          };
        } else if (this.attachPosition === 'bottom') {
          return {
            left: this.targetBoundingBox.left,
            top: this.targetBoundingBox.bottom,
            right:
              window.document.documentElement.clientWidth -
              this.targetBoundingBox.right,
            bottom: null,
            height: null,
            width: this.targetBoundingBox.width,
          };
        }
      }
      return {
        left: 0,
        top: 0,
        right: null,
        bottom: null,
        width: 0,
        height: 0,
      };
    },
    overlayStyle() {
      const res: any = {};
      if (this.boundingBox.left !== null) {
        res.left = `${this.boundingBox.left}px`;
      }
      if (this.boundingBox.right !== null) {
        res.right = `${this.boundingBox.right}px`;
      }
      if (this.boundingBox.top !== null) {
        res.top = `${this.boundingBox.top}px`;
      }
      if (this.boundingBox.bottom !== null) {
        res.bottom = `${this.boundingBox.bottom}px`;
      }
      if (!this.targetBoundingBox) {
        res.display = 'none';
      }
      return res;
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
    innerMounted() {
      if (this.$refs['inner']) {
        assignLogicalParent(
          this.$refs['inner'] as HTMLElement,
          this.targetComp,
        );
      }
    },
    innerBeforeUnmount() {
      if (this.$refs['inner']) {
        assignLogicalParent(this.$refs['inner'] as HTMLElement, null);
      }
    },
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
      if (this.$refs['inner']) {
        assignLogicalParent(
          this.$refs['inner'] as HTMLElement,
          this.targetComp,
        );
      }
      this.updateListeners(true);
    },
  },
});
</script>

<style lang="scss" scoped>
.OverlayElement {
  position: fixed;
  z-index: 3000;
}
</style>

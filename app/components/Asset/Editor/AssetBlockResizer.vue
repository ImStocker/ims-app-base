<template>
  <div class="AssetBlockResizer">
    <div ref="content" class="AssetBlockResizer-content" :style="contentStyle">
      <slot></slot>
      <div
        v-if="whichCaptured"
        class="AssetBlockResizer-content-overflow"
      ></div>
      <div
        v-if="canResize"
        class="AssetBlockResizer-resizer"
        :class="{ 'state-active': whichCaptured === 'content' }"
        @mousedown="capture('content')"
        @dblclick="resetSize()"
      ></div>
    </div>
  </div>
</template>

<script type="text/ecmascript-6" lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'AssetBlockResizer',
  components: {},
  props: {
    canResize: { type: Boolean, default: true },
    contentHeight: { type: Number, default: 400 },
    initialHeight: { type: Number, default: 400 },
    minHeight: { type: Number, default: 100 },
  },
  emits: ['update:contentHeight'],
  data() {
    return {
      whichCaptured: null as 'content' | null,
    };
  },
  computed: {
    contentStyle() {
      return {
        height: `${this.contentHeight}px`,
      };
    },
  },
  watch: {
    makeOneColumn(val) {
      if (val) this.release();
    },
  },
  mounted() {},
  unmounted() {
    this.release();
  },
  methods: {
    capture(which: 'content') {
      if (!this.whichCaptured) {
        this.whichCaptured = which;
        (this as any)._globalMouseMoveHandler = (evt: MouseEvent) => {
          const column_element = this.$refs[which] as HTMLElement;
          if (!column_element) return;

          const col_rect = column_element.getBoundingClientRect();

          let new_height = evt.pageY - col_rect.top - window.scrollY;
          if (new_height < this.minHeight) new_height = this.minHeight;
          new_height = Math.round(new_height);

          if (this.contentHeight !== new_height) {
            this.$emit(`update:contentHeight`, new_height);
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
        if (window.document.body.classList)
          window.document.body.classList.add('AssetBlockResizer-captured');
      }
    },
    release() {
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
      this.whichCaptured = null;
      if (window.document.body.classList)
        window.document.body.classList.remove('AssetBlockResizer-captured');
    },
    resetSize() {
      if (this.initialHeight !== this.contentHeight) {
        this.$emit(`update:contentHeight`, this.initialHeight);
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetBlockResizer-content {
  position: relative;
}

.AssetBlockResizer-right {
  flex: 1;
}

.AssetBlockResizer-resizer {
  width: 100%;
  height: 6px;
  background: #eee;
  position: absolute;
  left: 0px;
  bottom: -3px;
  cursor: ns-resize;
  transition: opacity 0.3s;
  opacity: 0;
  z-index: 100;

  &.state-active,
  &:hover {
    opacity: 0.9;
  }
}

.AssetBlockResizer-content-overflow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
}
</style>

<style lang="scss" rel="stylesheet/scss">
.AssetBlockResizer-captured {
  cursor: nw-resize;
  user-select: none;
}
</style>

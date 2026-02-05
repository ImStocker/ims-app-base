<template>
  <div ref="content" class="WidthResizer" :style="contentStyle">
    <div
      v-if="resizeSide === 'left'"
      class="WidthResizer-resizer type-left"
      :class="{ 'state-active': captureDirection === 'left' }"
      @mousedown="capture('left')"
      @dblclick="resetSize()"
    />
    <slot />
    <div
      v-if="resizeSide === 'right'"
      class="WidthResizer-resizer type-right"
      :class="{ 'state-active': captureDirection === 'right' }"
      @mousedown="capture('right')"
      @dblclick="resetSize()"
    />
  </div>
</template>
<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';

const DEFAULT_CONTENT_INITIAL_WIDTH = 225;
const DEFAULT_CONTENT_MIN_WIDTH = 100;

export default defineComponent({
  name: 'WidthResizer',
  components: {},
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    contentWidth: {
      type: Number,
      default: -1,
    },
    initialWidth: {
      type: Number,
      default: DEFAULT_CONTENT_INITIAL_WIDTH,
    },
    minWidth: {
      type: Number,
      default: DEFAULT_CONTENT_MIN_WIDTH,
    },
    resizeSide: {
      type: String as PropType<'left' | 'right'>,
      default: 'left',
    },
  },
  emits: ['update:contentWidth'],
  data() {
    return {
      captureDirection: null as 'left' | 'right' | null,
    };
  },
  computed: {
    contentStyle() {
      const width =
        this.contentWidth >= 0 ? this.contentWidth : this.initialWidth;
      return this.disabled
        ? {}
        : {
            width: `${width}px`,
          };
    },
  },
  unmounted() {
    this.release();
  },
  methods: {
    capture(direction: 'left' | 'right') {
      if (this.disabled) {
        return;
      }
      if (!this.captureDirection) {
        this.captureDirection = direction;
        (this as any)._globalMouseMoveHandler = (evt: MouseEvent) => {
          const content_element = this.$refs.content as HTMLElement;
          if (!content_element) return;

          const content_rect = content_element.getBoundingClientRect();

          let new_width =
            direction === 'left'
              ? content_rect.right - evt.pageX
              : evt.pageX - content_rect.left;
          if (new_width < this.minWidth) new_width = this.minWidth;
          new_width = Math.round(new_width);

          if (this.contentWidth !== new_width) {
            this.$emit('update:contentWidth', new_width);
          }
        };

        (this as any)._globalMouseUpHandler = (_evt: MouseEvent) => {
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
          window.document.body.classList.add('WidthResizer-captured');
      }
    },
    release() {
      if (this.disabled) {
        return;
      }
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
      this.captureDirection = null;
      if (window.document.body.classList)
        window.document.body.classList.remove('WidthResizer-captured');
    },
    resetSize() {
      if (this.disabled) {
        return;
      }
      if (this.initialWidth !== this.contentWidth) {
        this.$emit('update:contentWidth', this.initialWidth);
      }
    },
  },
});
</script>
<style lang="scss" scoped>
@use '$style/devices-mixins.scss';

.WidthResizer {
  height: 100%;
  position: relative;
}
.WidthResizer-resizer {
  width: 6px;
  height: 100%;
  background: #eee;
  position: absolute;
  top: 0px;
  cursor: ew-resize;
  transition: opacity 0.3s;
  opacity: 0;
  z-index: 100;

  @include devices-mixins.device-type(not-pc) {
    display: none;
  }
  &.type-left {
    left: 0;
  }
  &.type-right {
    right: 0;
  }
  &.state-active,
  &:hover {
    opacity: 0.9;
  }
}
</style>
<style lang="scss" rel="stylesheet/scss">
.WidthResizer-captured {
  cursor: ew-resize;
  user-select: none;
}
</style>

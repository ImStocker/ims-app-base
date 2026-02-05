<template>
  <div
    class="PageResizer"
    :class="{
      ['type-resize-side-' + resizeSide]: true,
    }"
  >
    <div ref="leftColumn" class="PageResizer-left" :style="leftColumnStyle">
      <slot></slot>
      <div
        v-if="canResize && resizeSide === 'left'"
        class="PageResizer-resizer type-left"
        :class="{ 'state-active': whichCaptured === 'left' }"
        @mousedown="capture('left')"
        @dblclick="resetSize()"
      ></div>
    </div>
    <div ref="rightColumn" class="PageResizer-right" :style="rightColumnStyle">
      <slot name="right"></slot>
      <div
        v-if="canResize && resizeSide === 'right'"
        class="PageResizer-resizer type-right"
        :class="{ 'state-active': whichCaptured === 'right' }"
        @mousedown="capture('right')"
        @dblclick="resetSize()"
      ></div>
    </div>
  </div>
</template>

<script type="text/ecmascript-6" lang="ts">
import { type PropType, defineComponent } from 'vue';

export default defineComponent({
  name: 'PageResizer',
  components: {},
  props: {
    canResize: { type: Boolean, default: true },
    contentWidth: { type: Number, default: -1 },
    initialWidth: { type: Number, default: 960 },
    minWidth: { type: Number, default: 100 },
    resizeSide: { type: String as PropType<'left' | 'right'>, default: 'left' },
  },
  emits: ['update:contentWidth'],
  data() {
    return {
      whichCaptured: null as 'left' | 'right' | null,
    };
  },
  computed: {
    leftColumnStyle() {
      const width =
        this.contentWidth >= 0 ? this.contentWidth : this.initialWidth;
      if (this.resizeSide === 'left') {
        return {
          width: `${width}px`,
        };
      } else {
        return {};
      }
    },
    rightColumnStyle() {
      const width =
        this.contentWidth >= 0 ? this.contentWidth : this.initialWidth;
      if (this.resizeSide === 'right') {
        return {
          width: `${width}px`,
        };
      } else {
        return {};
      }
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
    capture(which: 'left' | 'right') {
      if (!this.whichCaptured) {
        this.whichCaptured = which;
        (this as any)._globalMouseMoveHandler = (evt: MouseEvent) => {
          const column_element = this.$refs[which + 'Column'] as HTMLElement;
          if (!column_element) return;

          const col_rect = column_element.getBoundingClientRect();

          let new_width =
            which === 'left'
              ? evt.pageX - col_rect.left
              : col_rect.right - evt.pageX;
          if (new_width < this.minWidth) new_width = this.minWidth;
          new_width = Math.round(new_width);

          if (this.contentWidth !== new_width) {
            this.$emit(`update:contentWidth`, new_width);
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
          window.document.body.classList.add('PageResizer-captured');
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
        window.document.body.classList.remove('PageResizer-captured');
    },
    resetSize() {
      if (this.initialWidth !== this.contentWidth) {
        this.$emit(`update:contentWidth`, this.initialWidth);
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins';

.PageResizer {
  display: flex;

  @include devices-mixins.device-type(not-pc) {
    display: block;

    .PageResizer-left,
    .PageResizer-right {
      width: 100% !important;
    }

    .PageResizer-resizer {
      display: none;
    }
  }
}

.PageResizer.type-resize-side-left {
  .PageResizer-left {
    position: relative;
  }

  .PageResizer-right {
    flex: 1;
  }
}

.PageResizer.type-resize-side-right {
  .PageResizer-right {
    position: relative;
  }

  .PageResizer-left {
    flex: 1;
  }
}

.PageResizer-resizer {
  width: 6px;
  height: 100%;
  background: #eee;
  position: absolute;
  top: 0px;
  cursor: ew-resize;
  transition: opacity 0.3s;
  opacity: 0;
  z-index: 100;

  &.type-left {
    right: -3px;
  }

  &.type-right {
    left: -3px;
  }

  &.state-active,
  &:hover {
    opacity: 0.9;
  }
}
</style>

<style lang="scss" rel="stylesheet/scss">
.PageResizer-captured {
  cursor: ew-resize;
  user-select: none;
}
</style>

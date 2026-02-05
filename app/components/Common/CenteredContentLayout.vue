<template>
  <div class="CenteredContentLayout large-scrollbars" :style="contentStyle">
    <div class="CenteredContentLayout-left"></div>
    <div class="CenteredContentLayout-content-wrapper">
      <div class="CenteredContentLayout-content">
        <slot name="content-left-column"></slot>
        <slot></slot>
        <slot name="content-right-column"></slot>
      </div>
    </div>
    <div class="CenteredContentLayout-right">
      <div class="CenteredContentLayout-right-space"></div>
      <div class="CenteredContentLayout-right-content">
        <slot name="right"></slot>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import { APP_NAVIGATION_SECTION_INITIAL_WIDTH } from '../layoutConstants';

export default defineComponent({
  name: 'CenteredContentLayout',
  props: {
    menuWidth: {
      type: Number,
      default: APP_NAVIGATION_SECTION_INITIAL_WIDTH,
    },
    rightSideWidth: {
      type: Number,
      default: 200,
    },
  },
  computed: {
    contentStyle() {
      return {
        '--CenteredContentLayout-menu-width': `${this.menuWidth}`,
        '--CenteredContentLayout-menu-width-px': `${this.menuWidth}px`,
        '--CenteredContentLayout-right-side-width': `${this.rightSideWidth}`,
        '--CenteredContentLayout-right-side-width-px': `${this.rightSideWidth}px`,
      };
    },
  },
});
</script>
<style lang="scss" scoped>
@use '$style/devices-mixins.scss';

.CenteredContentLayout {
  flex: 1;
  display: flex;
  min-width: 0px;
  overflow-y: scroll;
}
.CenteredContentLayout-left {
  width: calc(
    max(
      var(--CenteredContentLayout-right-side-width-px) - var(
          --CenteredContentLayout-menu-width-px
        ),
      0px
    )
  );
  flex-shrink: calc(
    max(
        var(--CenteredContentLayout-right-side-width),
        var(--CenteredContentLayout-menu-width)
      ) /
      max(
        var(--CenteredContentLayout-right-side-width) - var(
            --CenteredContentLayout-menu-width
          ),
        0.1
      )
  );

  @include devices-mixins.device-type(not-pc) {
    width: 0 !important;
  }
}
.CenteredContentLayout-content-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 0 10px;

  @include devices-mixins.device-type(not-pc) {
    padding: 0px 10px;
    width: 100%;
  }

  .CenteredContentLayout-content {
    display: flex;

    @include devices-mixins.device-type(not-pc) {
      width: 100%;
    }
  }
}
.CenteredContentLayout-right {
  width: calc(
    max(
      var(--CenteredContentLayout-right-side-width-px),
      var(--CenteredContentLayout-menu-width-px)
    )
  );
  display: flex;
  min-width: 0;
  flex-shrink: 1;
  overflow: hidden;

  @include devices-mixins.device-type(not-pc) {
    width: 0;
  }

  .CenteredContentLayout-right-space {
    flex: 1;
  }
  .CenteredContentLayout-right-content {
    width: var(--CenteredContentLayout-right-side-width-px);
  }
}
</style>

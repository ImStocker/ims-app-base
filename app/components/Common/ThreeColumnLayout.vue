<template>
  <div class="ThreeColumnLayout">
    <aside
      v-if="$slots['left-column']"
      class="ThreeColumnLayout-column left"
      :class="{ 'mobile-state': leftColumnMobileState }"
    >
      <div class="ThreeColumnLayout-column-inner">
        <button
          class="if-size-not-pc is-button is-button-icon ThreeColumnLayout-column-inner-close"
          @click="leftColumnMobileState = false"
        >
          <i class="ri-close-line" />
        </button>
        <slot name="left-column" />
      </div>
      <button
        class="if-size-not-pc ThreeColumnLayout-column-toggle is-button is-button-icon"
        :class="{ open: leftColumnMobileState }"
        @click="leftColumnMobileState = !leftColumnMobileState"
      >
        <i class="ri-menu-3-line" />
      </button>
    </aside>
    <div v-if="$slots['main-column']" class="ThreeColumnLayout-column main">
      <slot name="main-column" />
    </div>
    <aside v-if="$slots['right-column']" class="ThreeColumnLayout-column">
      <slot name="right-column" />
    </aside>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ThreeColumnLayout',
  data() {
    return {
      leftColumnMobileState: false,
    };
  },
  computed: {
    routeFullPath() {
      return this.$route.fullPath;
    },
  },
  watch: {
    routeFullPath() {
      this.leftColumnMobileState = false;
    },
    leftColumnMobileState() {
      if (this.leftColumnMobileState)
        document.body.classList.add('body-SpaceMainPage-mobileMenuOpened');
      else
        document.body.classList.remove('body-SpaceMainPage-mobileMenuOpened');
    },
  },
});
</script>
<style lang="scss" rel="stylesheet/scss">
.body-SpaceMainPage-mobileMenuOpened {
  overflow: hidden;
}
</style>
<style lang="scss" scoped>
@use '$style/devices-mixins.scss';

.ThreeColumnLayout {
  display: flex;
  position: relative;
  gap: 15px;

  @include devices-mixins.device-type(not-pc) {
    flex-direction: column-reverse;
    padding: 0 4px;
  }
}
.ThreeColumnLayout-column {
  &:not(.main) {
    width: 327px;
    @include devices-mixins.device-type(not-pc) {
      width: 100%;
    }
  }

  @include devices-mixins.device-type(not-pc) {
    width: 100%;
  }

  &.main {
    flex: 1;
    min-width: 100px;
  }

  &.left {
    @include devices-mixins.device-type(not-pc) {
      position: absolute;
      background-color: var(--panel-bg-color);
      width: 100%;
      height: 100vh;
      height: 100dvh;
      left: -100%;
      top: -100px;
      z-index: 3;
      transition: left 0.2s;
      display: flex;

      &.mobile-state {
        left: 0;
      }
    }
  }
}
.ThreeColumnLayout-column-toggle {
  --button-border-radius: 0px 5px 5px 0px !important;
  --button-bg-color: var(--local-hl-bg-color);
  height: fit-content;
  margin-top: 60px;
  box-shadow: 0px 0px 4px 0px rgba(0, 0, 0, 0.2);
  --button-outline-width: 1px !important;
}
.ThreeColumnLayout-column-inner {
  @include devices-mixins.device-type(not-pc) {
    padding-top: 60px;
    padding: 60px var(--panel-padding-horizontal) 0px;
    width: 100%;
    flex-shrink: 0;

    --panel-border-radius: 0px;
    --panel-border-width: 0px;
  }
}
.ThreeColumnLayout-column-inner-close {
  --button-border-radius: 10px !important;
  --button-bg-color: var(--local-hl-bg-color);
  width: fit-content;

  @include devices-mixins.device-type(not-pc) {
    display: flex;
  }
}
</style>

<template>
  <div class="ScrollableHorizontalContainer">
    <slot name="left-overflow" :hasOverflow="leftOverflow">
      <transition name="fade">
        <span
          v-if="leftOverflow"
          :class="{
          'ScrollableHorizontalContainer-overflow-marker': true,
          'ScrollableHorizontalContainer-overflow-marker-left': true,
          'ScrollableHorizontalContainer-overflow-marker-visible': leftOverflow,
          }"
        >
          ...
        </span>
      </transition>
    </slot>
    <div
      class="ScrollableHorizontalContainer-scrollable"
      ref="container"
      @wheel.prevent="handleWheel"
      @scroll="updateOverflow"
    >
      <div class="ScrollableHorizontalContainer-content-container">
        <slot name="content"></slot>
      </div>
    </div>
    <slot name="right-overflow" :hasOverflow="rightOverflow">
      <transition name="fade">
        <span
          v-if="rightOverflow"
          :class="{
          'ScrollableHorizontalContainer-overflow-marker': true,
          'ScrollableHorizontalContainer-overflow-marker-right': true,
          'ScrollableHorizontalContainer-overflow-marker-visible': rightOverflow,
          }"
        >
          ...
        </span>
      </transition>
    </slot>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    props: {
        contentChangedKey: {
            /**
             * Use to update state of content
             * And to recheck overflow
             */
            type: Number,
            required: true,
        },
    },
    data() {
        return {
            leftOverflow: false,
            rightOverflow: false,
        };
    },
    watch: {
        contentChangedKey() {
            this.$nextTick(() => {
                this.updateOverflow();
                this.resetPosition();
            });
        },
    },
    methods: {
        handleWheel(e) {
            (this.$refs.container as HTMLDivElement).scrollLeft += e.deltaY;
        },
        updateOverflow() {
            const el = this.$refs.container as HTMLDivElement;
            this.leftOverflow = el.scrollLeft > 0;
            this.rightOverflow = el.scrollLeft + el.clientWidth < el.scrollWidth - 20;
        },
        resetPosition() {
            const el = this.$refs.container as HTMLDivElement;
            el.scrollLeft = el.scrollWidth;
        },
    }
});
</script>

<style scoped lang="scss">
.ScrollableHorizontalContainer {
    position: relative;
    overflow: hidden;
}

.ScrollableHorizontalContainer-scrollable {
    width: 100%;
    position: relative;
    overflow: hidden;
    white-space: nowrap;
}

.ScrollableHorizontalContainer-content-container {
    width: 100%;
    display: inline-block;
    transition: transform 0.3s ease;
    will-change: transform;
}

.ScrollableHorizontalContainer-overflow-marker {
    position: absolute;
    padding-left: 5px;
    padding-right: 5px;
    transition: 0.1s;
    opacity: 0;
    top: 0;
    z-index: 2;
}

.ScrollableHorizontalContainer-overflow-marker-right {
    background: linear-gradient(0.75turn, var(--local-bg-color) 80%, transparent);
    right: 0;
}

.ScrollableHorizontalContainer-overflow-marker-left {
    background: linear-gradient(0.25turn, var(--local-bg-color) 80%, transparent);
    left: 0;
}

.ScrollableHorizontalContainer-overflow-marker-visible {
    opacity: 1;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
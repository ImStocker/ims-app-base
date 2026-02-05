<template>
  <div class="AppToasts">
    <transition-group name="toasts">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="AppToasts-toast"
        :class="{
          ['type-' + toast.type]: true,
          'state-done':
            toast.type === ToastTypes.PROGRESS &&
            (toast.progress === 1 || toast.progress === null),
        }"
        @mouseenter="toast.pause()"
        @mouseleave="toast.resume()"
      >
        <button
          v-if="toast.abortController"
          class="is-button is-button-icon-small AppToasts-toast-close"
          @click="toast.close(true)"
        >
          <i class="ri-close-line"></i>
        </button>
        <div v-if="toast.icon" class="AppToasts-toast-icon">
          <i :class="toast.icon"></i>
        </div>
        <div class="AppToasts-toast-content">
          <div class="AppToasts-toast-message">
            {{ toast.message }}
            <div
              v-if="toast.errors && toast.errors.length"
              class="AppToasts-toast-errors"
              :title="toast.errors.slice(0, 3).join('\n')"
            ></div>
          </div>
          <div
            v-if="toast.progress"
            class="AppToasts-toast-progress-bar-wrapper"
          >
            <div class="AppToasts-toast-progress-bar">
              <div
                class="AppToasts-toast-progress-bar-line"
                :class="{ done: toast.progress === 1 }"
                :style="{ width: `${Math.round(toast.progress * 100)}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </transition-group>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import UiManager, { ToastTypes } from '../../logic/managers/UiManager';

export default defineComponent({
  name: 'AppToasts',
  computed: {
    toasts() {
      return this.$getAppManager().get(UiManager).getToasts();
    },
    ToastTypes() {
      return ToastTypes;
    },
  },
});
</script>
<style lang="scss" scoped>
.toasts-enter-active,
.toasts-leave-active {
  transition: all 0.5s ease;
}
.toasts-enter-from,
.toasts-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
.AppToasts {
  display: flex;
  flex-direction: column-reverse;
  gap: 15px;
  padding-bottom: 20px;
  height: 100%;
}
.AppToasts-toast {
  pointer-events: auto;
  display: flex;
  position: relative;
  gap: 15px;
  background-color: var(--app-toasts-bg-color);
  width: 350px;
  padding: 15px 20px;
  align-items: center;
  border-radius: 4px;
  color: var(--app-toasts-text-color);
  box-shadow: 0px 2px 4px 0px #00000040;

  &.state-done {
    --app-toasts-border-color: var(--color-success);
    --app-toasts-progress-color: var(--color-success);
  }

  &.type-success {
    --app-toasts-text-color: #e9e9e9;
    background-color: var(--app-toasts-success-color);
  }
  &.type-error {
    --app-toasts-text-color: #e9e9e9;
    background-color: var(--app-toasts-fail-color);
  }
  &.type-progress {
    border: 1px solid var(--app-toasts-border-color);
  }
}
.AppToasts-toast-close {
  position: absolute;
  right: 5px;
  top: 5px;
  --button-text-color: var(--app-toasts-text-color) !important;
  &:hover {
    --button-bg-color: rgba(255, 255, 255, 0.1) !important;
  }
}
.AppToasts-toast-icon {
  font-size: 24px;
  line-height: normal;
}

.AppToasts-toast-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;

  .AppToasts-toast-message {
    color: var(--app-toasts-text-color);
  }

  .AppToasts-toast-progress-bar-wrapper {
    display: flex;
    width: 100%;
    align-items: center;
    .AppToasts-toast-progress-bar {
      width: 100%;
      height: 3px;
      border-radius: 999px;
      overflow: hidden;

      .AppToasts-toast-progress-bar-line {
        height: 100%;
        background-color: var(--app-toasts-progress-color);
        transition: width 0.1s ease-in-out;
      }
    }
  }

  .AppToasts-toast-errors {
    display: inline-block;
    font-size: 8px;
    border-radius: 50%;
    background: red;
    color: #fff;
    width: 12px;
    height: 12px;
    line-height: 12px;
    vertical-align: middle;
    text-align: center;
    &:after {
      content: '!';
      position: relative;
      left: -0.5px;
    }
  }
}
</style>

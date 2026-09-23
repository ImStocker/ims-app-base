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
            >
              {{ toast.errors.length }}
            </div>
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
        <button
          v-if="toast.action"
          type="button"
          class="AppToasts-toast-action"
          @click="runAction(toast)"
        >
          {{ toast.action }}
        </button>
      </div>
    </transition-group>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import UiManager, {
  ToastTypes,
  type Toast,
} from '../../logic/managers/UiManager';

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
  methods: {
    runAction(toast: Toast) {
      toast.onAction?.();
      toast.close();
    },
  },
});
</script>
<style lang="scss" scoped>
.toasts-enter-active,
.toasts-leave-active {
  transition: all 0.2s ease;
}
.toasts-enter-from,
.toasts-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
.AppToasts {
  position: fixed;
  left: auto;
  right: 20px;
  bottom: 20px;
  z-index: 3000;
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
  gap: 10px;
  width: 100%;
  pointer-events: none;
}
.AppToasts-toast {
  pointer-events: auto;
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: fit-content;
  min-width: 260px;
  max-width: min(90vw, 400px);
  padding: 12px 14px;
  border-radius: 10px;
  background-color: var(--dropdown-bg-color);
  border: 1px solid var(--root-border-color);
  backdrop-filter: var(--dropdown-bg-filter);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  color: var(--local-text-color);
  font-size: 14px;

  &.type-success {
    --app-toasts-accent-color: var(--color-success);
    background-color: color-mix(
      in srgb,
      var(--color-success) 8%,
      var(--dropdown-bg-color)
    );
    border-color: color-mix(in srgb, var(--color-success) 25%, transparent);
  }
  &.type-error {
    --app-toasts-accent-color: var(--color-danger);
    background-color: color-mix(
      in srgb,
      var(--color-danger) 12%,
      var(--dropdown-bg-color)
    );
    border-color: color-mix(in srgb, var(--color-danger) 35%, transparent);
  }
  &.type-progress {
    --app-toasts-accent-color: var(--color-accent);
  }
  &.state-done {
    --app-toasts-accent-color: var(--color-success);
  }
}
.AppToasts-toast-close {
  position: absolute;
  right: 5px;
  top: 5px;
  --button-text-color: var(--local-sub-text-color);
  &:hover {
    --button-bg-color: rgba(255, 255, 255, 0.1);
  }
}
.AppToasts-toast-icon {
  font-size: 20px;
  line-height: normal;
  color: var(--app-toasts-accent-color);
}

.AppToasts-toast-action {
  border: none;
  background: none;
  padding: 0;
  margin-left: auto;
  color: var(--color-accent);
  font-family: var(--local-font-family);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
}

.AppToasts-toast-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 5px;
  min-width: 0;

  .AppToasts-toast-message {
    color: var(--local-text-color);
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
      background-color: color-mix(
        in srgb,
        var(--local-text-color) 12%,
        transparent
      );

      .AppToasts-toast-progress-bar-line {
        height: 100%;
        background-color: var(--app-toasts-accent-color);
        transition: width 0.1s ease-in-out;
      }
    }
  }

  .AppToasts-toast-errors {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    margin-left: 6px;
    border-radius: 999px;
    background-color: var(--color-danger);
    color: #fff;
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    vertical-align: middle;
  }
}

@media (max-width: 480px) {
  .AppToasts {
    left: 0;
    right: 0;
    bottom: auto;
    top: 0;
    align-items: center;
    gap: 8px;
    padding: 12px;
  }
  .AppToasts-toast {
    width: 100%;
    max-width: none;
    min-width: 0;
  }
}
</style>

<template>
  <div class="DialogContent">
    <div v-if="loading" class="DialogContent-loading">
      <div class="loaderSpinner" />
    </div>
    <div v-else-if="loadingError" class="Dialog-error error-message-block">
      {{ loadingError }}
    </div>
    <template v-else>
      <div v-if="$slots.header" class="Dialog-header">
        <slot name="header" />
      </div>
      <div class="Dialog-content">
        <slot name="content">
          <slot />
        </slot>
      </div>
      <div v-if="$slots.footer" class="Dialog-footer">
        <slot name="footer" />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';

export default defineComponent({
  name: 'DialogContent',
  props: {
    loading: {
      type: Boolean,
      default: false,
    },
    loadingError: {
      type: [String, null] as PropType<string | null>,
      default: null,
    },
  },
  emits: ['enterPress', 'escapePress'],
  mounted() {
    this.resetListeners(true);
  },
  unmounted() {
    this.resetListeners(false);
  },
  methods: {
    resetListeners(init: boolean) {
      if ((this as any)._keydownHandler) {
        window.removeEventListener('keydown', (this as any)._keydownHandler);
        (this as any)._keydownHandler = null;
      }
      if ((this as any)._keyupHandler) {
        window.removeEventListener('keyup', (this as any)._keyupHandler);
        (this as any)._keyupHandler = null;
      }
      if (init) {
        let key_code_down: string | null = null;
        let is_inside_active = false;
        (this as any)._keydownHandler = (e: KeyboardEvent) => {
          if (!this.$el) return;
          key_code_down = e.code;
          is_inside_active = !!(this.$el as HTMLElement).closest(
            '.DialogHostDialog.state-current',
          );
        };
        window.addEventListener('keydown', (this as any)._keydownHandler);
        (this as any)._keyupHandler = (e: KeyboardEvent) => {
          if (!is_inside_active) return;
          if (e.code === key_code_down) {
            if (e.code === 'Escape') {
              this.$emit('escapePress', e);
            } else if (e.code === 'Enter') {
              this.$emit('enterPress', e);
            }
          }
        };
        window.addEventListener('keyup', (this as any)._keyupHandler);
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss">
.Dialog-error {
  color: var(--color-main-error);
}
</style>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins.scss';

.DialogContent {
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2);
  padding: 25px 15px;
  background: var(--local-bg-color);
  color: var(--local-text-color);
  border-radius: 4px;

  @include devices-mixins.device-type(not-pc) {
    width: 100% !important;
    min-width: 100% !important;
  }
}

.DialogContent-loading {
  text-align: center;
  .loaderSpinner {
    font-size: 16px;
  }
}

.Dialog-error {
  margin: 0 20px;
}
</style>
<style lang="scss" rel="stylesheet/scss"></style>

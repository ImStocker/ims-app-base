<template>
  <div class="ScreenshotRenderer">
    <slot v-if="disabled"></slot>
    <template v-else>
      <div v-if="loadingError" class="ScreenshotRenderer-error">
        {{ loadingError }}
      </div>
      <img v-else-if="!isLoading" :src="imageSrc" style="max-width: 100%" />
      <div v-else ref="content" class="ScreenshotRenderer-content">
        <slot></slot>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ScreenshotRenderer',
  props: {
    ready: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['renderingDone'],
  data() {
    return {
      imageSrc: '',
      isLoading: true,
      loadingError: null as string | null,
    };
  },
  computed: {
    renderingDone() {
      if (!this.ready) return false;
      return this.disabled || !this.isLoading;
    },
  },
  watch: {
    async ready() {
      await this.refresh();
    },
    async disabled() {
      await this.refresh();
    },
    renderingDone() {
      this.$emit('renderingDone', this.renderingDone);
    },
  },
  async mounted() {
    if (!this.renderingDone) {
      this.$emit('renderingDone', false);
    }
    await this.refresh();
    if (this.renderingDone) {
      this.$emit('renderingDone', true);
    }
  },
  methods: {
    async refresh() {
      if (this.ready && !this.disabled) {
        try {
          this.loadingError = null;
          this.isLoading = true;
          await this.$nextTick();
          const html2canvas = (await import('html2canvas')).default;
          const image = await html2canvas(this.$refs['content'] as HTMLElement);
          this.imageSrc = image.toDataURL('image/png');
        } catch (err: any) {
          this.loadingError = err.message;
        } finally {
          this.isLoading = false;
        }
      }
    },
  },
});
</script>

<style>
.ScreenshotRenderer-error {
  color: var(--color-main-error);
}
</style>

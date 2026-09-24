<template>
  <label
    class="FileSelect"
    :class="{
      'is-disabled': disable || uploading,
      'is-dragging': dragging,
    }"
    @dragover="onDragOver"
    @drop="onDrop"
    @dragleave.prevent="dragging = false"
  >
    <input
      ref="file"
      type="file"
      :accept="accept"
      style="display: none"
      :disabled="disable || uploading"
      @change="handleFile"
    />
    <span class="FileSelect-icon" :class="{ 'is-progress': uploading }">
      <svg v-if="uploading" class="FileSelect-ring" viewBox="0 0 40 40">
        <circle
          class="FileSelect-ringTrack"
          cx="20"
          cy="20"
          r="17"
          fill="none"
        ></circle>
        <circle
          class="FileSelect-ringValue"
          cx="20"
          cy="20"
          r="17"
          :style="{ strokeDashoffset: ringOffset }"
        ></circle>
      </svg>
      <i v-else :class="icon"></i>
    </span>
    <span class="FileSelect-body">
      <span class="FileSelect-text">
        {{ uploading ? $t('file.uploading') : text || $t('file.selectFile') }}
      </span>
      <span v-if="uploading || hint" class="FileSelect-hint">
        <template v-if="uploading">{{ percent }}%</template>
        <template v-else>{{ hint }}</template>
      </span>
    </span>
  </label>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'FileSelect',
  props: {
    icon: { type: String, default: 'ri-image-add-line' },
    text: { type: String, default: '' },
    hint: { type: String, default: '' },
    accept: { type: String, default: '' },
    upload: {
      type: Function,
      required: true,
    },
    disable: { type: Boolean, default: false },
  },
  emits: ['uploaded', 'error'],
  data() {
    return {
      uploading: false,
      dragging: false,
      percent: 0,
    };
  },
  computed: {
    ringOffset() {
      const perimeter = 2 * Math.PI * 17;
      return perimeter * (1 - this.percent / 100);
    },
  },
  methods: {
    onDragOver(event: DragEvent) {
      const event_dt = event.dataTransfer;
      if (!event_dt || !event_dt.types.includes('Files')) return;
      if (this.disable || this.uploading) return;
      event_dt.dropEffect = 'copy';
      this.dragging = true;
      event.preventDefault();
    },
    onDrop(event: DragEvent) {
      event.preventDefault();
      this.dragging = false;
      if (this.disable || this.uploading || !event.dataTransfer?.files?.length)
        return;
      this.handleFile(event);
    },
    handleFile(e: any) {
      let files: File[] = [];
      if (e.target && e.target.files) {
        files = [...e.target.files];
      } else if (e.dataTransfer && e.dataTransfer.files) {
        files = [...e.dataTransfer.files];
      }
      e.target.value = '';
      if (files.length === 0) return;
      this.uploadAsync(files[0]);
    },
    async uploadAsync(file: File) {
      const upload = this.upload as (
        file: File,
        onProgress?: (percent: number) => void,
      ) => Promise<any>;
      this.uploading = true;
      this.percent = 0;
      try {
        const result = await upload(file, (p) => {
          this.percent = Math.round(Math.max(0, Math.min(1, p)) * 100);
        });
        this.$emit('uploaded', result);
      } catch (err) {
        this.$emit('error', err);
      } finally {
        this.uploading = false;
        this.percent = 0;
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.FileSelect {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px 10px 10px;
  border: 1px dashed var(--local-border-color);
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background-color 0.15s;

  &:hover:not(.is-disabled),
  &.is-dragging {
    border-color: color-mix(in srgb, var(--local-text-color) 30%, transparent);
    background: var(--local-hl-bg-color);
  }
  &.is-dragging {
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  }
  &.is-disabled {
    cursor: default;
  }
}
.FileSelect-icon {
  width: 40px;
  height: 40px;
  border-radius: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  color: var(--color-accent);
  font-size: 20px;
  flex-shrink: 0;
  pointer-events: none;
}
.FileSelect-ring {
  width: 100%;
  height: 100%;
  display: block;
  transform: rotate(-90deg);
}
.FileSelect-ringTrack,
.FileSelect-ringValue {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
}
.FileSelect-ringTrack {
  stroke: color-mix(in srgb, var(--color-accent) 16%, transparent);
}
.FileSelect-ringValue {
  stroke: var(--color-accent);
  stroke-dasharray: 106.814;
  transition: stroke-dashoffset 0.15s linear;
}
.FileSelect-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  pointer-events: none;
}
.FileSelect-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--local-text-color);
  white-space: nowrap;
}
.FileSelect-hint {
  font-size: 12px;
  color: var(--local-sub-text-color);
  white-space: nowrap;
}
</style>

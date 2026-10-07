<template>
  <div class="VideoPreview">
    <img
      v-if="thumbSrc"
      class="VideoPreview-thumb"
      :src="thumbSrc"
      @error="onThumbError"
    />
    <div v-else class="VideoPreview-stub" :class="{ 'has-title': !!stubTitle }">
      <i class="VideoPreview-stub-play ri-play-circle-line"></i>
      <div v-if="stubTitle" class="VideoPreview-stub-title">
        {{ stubTitle }}
      </div>
    </div>
    <div v-if="thumbSrc" class="VideoPreview-play">
      <i class="ri-play-circle-line"></i>
    </div>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';

export default defineComponent({
  name: 'VideoPreview',
  props: {
    code: {
      type: String,
      required: true,
    },
    type: {
      type: String as PropType<'extvideo' | 'youtube' | 'vkvideo' | 'rutube'>,
      default: 'youtube',
    },
  },
  data() {
    return {
      failedThumbUrl: null as string | null,
    };
  },
  computed: {
    thumbUrl(): string {
      switch (this.type) {
        case 'youtube':
          return 'https://i.ytimg.com/vi/' + this.code + '/0.jpg';
        case 'rutube':
          return `https://rutube.ru/api/video/${this.code}/thumbnail/?redirect=1`;
        default:
          return '';
      }
    },
    thumbSrc(): string | null {
      if (!this.thumbUrl) return null;
      if (this.failedThumbUrl === this.thumbUrl) return null;
      return this.thumbUrl;
    },
    extvideoTitle(): string | null {
      if (this.type !== 'extvideo') return null;
      const m = this.code.match(/[^/]+(?=\.mp4$)/);
      if (!m) return null;
      return m[0];
    },
    stubTitle(): string | null {
      return this.extvideoTitle;
    },
  },
  methods: {
    onThumbError() {
      this.failedThumbUrl = this.thumbUrl;
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.VideoPreview {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border-radius: var(--video-preview-radius, 10px);
  background-color: var(--default-bg-primary);
}

.VideoPreview-thumb {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}

.VideoPreview-stub {
  width: 100%;
  height: 100%;
  min-width: var(--video-preview-stub-min-width, 0);
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 6px;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px
    color-mix(in srgb, var(--text-intense) 12%, transparent);
  background-color: var(--default-bg-primary);
}

.VideoPreview-play,
.VideoPreview-stub-play {
  flex: none;
  color: var(--text-intense);
  font-size: var(--video-preview-play-size, 50px);
  line-height: 1;
  opacity: var(--video-preview-play-opacity, 0.2);
  transition:
    transform 0.15s ease,
    opacity 0.15s ease;
}

.VideoPreview-play:hover,
.VideoPreview-stub:hover .VideoPreview-stub-play {
  opacity: var(--video-preview-play-hover-opacity, 0.4);
  transform: scale(1.1);
}

.VideoPreview-stub.has-title .VideoPreview-stub-play {
  font-size: min(
    var(--video-preview-play-size, 50px),
    var(--video-preview-stub-titled-play-size, 40px)
  );
}

.VideoPreview-stub-title {
  max-width: 100%;
  font-size: 13px;
  line-height: 1.3;
  text-align: center;
  color: var(--text-intense);
  opacity: 0.75;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.VideoPreview-play {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
</style>

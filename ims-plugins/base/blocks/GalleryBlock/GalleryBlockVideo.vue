<template>
  <a
    class="GalleryBlockVideo"
    :href="link"
    target="_blank"
    @click.prevent="open"
  >
    <img
      v-if="previewLink"
      class="GalleryBlockVideo-preview"
      :src="previewLink"
    />
    <div v-else class="ExternalVideo-preview">
      <div class="ExternalVideo-preview-title">
        {{ extvideoTitle }}
      </div>
    </div>
    <div v-if="previewLink" class="GalleryBlockVideo-play">
      <i class="ri-play-circle-line"></i>
    </div>
  </a>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import DialogManager from '#logic/managers/DialogManager';
import GalleryBlockVideoDialog from './GalleryBlockVideoDialog.vue';

export default defineComponent({
  name: 'GalleryBlockVideo',
  components: {},
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
  computed: {
    extvideoTitle() {
      if (this.type === 'extvideo') {
        const m = this.link.match(/[^/]+(?=\.mp4$)/);
        if (!m) return null;
        return m[0];
      } else {
        return null;
      }
    },
    link() {
      let link = '';
      switch (this.type) {
        case 'youtube':
          link = 'https://www.youtube.com/watch?v=' + this.code;
          break;
        case 'vkvideo': {
          const [oid, id] = this.code.split('_');
          link = `https://vk.com/video${oid}_${id}`;
          // link = `https://vk.com/video_ext.php?oid=${oid}&id=${id}`
          break;
        }
        case 'rutube':
          link = 'https://rutube.ru/video/' + this.code;
          break;
        case 'extvideo':
          link = this.code;
          break;
      }
      return link;
    },
    previewLink() {
      let link = '';
      switch (this.type) {
        case 'youtube':
          link = 'https://i.ytimg.com/vi/' + this.code + '/0.jpg';
          break;
        case 'rutube':
          link = `https://rutube.ru/api/video/${this.code}/thumbnail/?redirect=1`;
          break;
      }
      return link;
    },
  },
  methods: {
    open(ev: MouseEvent) {
      if (ev.ctrlKey || ev.metaKey) {
        window.open(this.link, '_blank');
      } else {
        this.$getAppManager().get(DialogManager).show(GalleryBlockVideoDialog, {
          code: this.code,
          type: this.type,
        });
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.GalleryBlockVideo {
  position: relative;
  display: block;
  text-decoration: none;
}

.GalleryBlockVideo-preview {
  display: block;
  height: 100%;
  min-width: 150px;
}

.ExternalVideo-preview {
  min-width: 300px;
  background-color: var(--local-bg-color);
  background-size: 100px 100px;

  .ExternalVideo-preview-title {
    position: absolute;
    bottom: 10px;
    text-align: center;
    width: 100%;
  }
}

.GalleryBlockVideo-play {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 100px;
  color: var(--text-intense);
  opacity: 0.2;
  cursor: pointer;

  &:hover {
    opacity: 0.4;
  }
}

video::-webkit-media-controls {
  display: none !important;
}
</style>

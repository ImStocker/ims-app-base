<template>
  <a
    class="GalleryBlockVideo"
    :href="link"
    target="_blank"
    @click.prevent="open"
  >
    <video-preview
      class="GalleryBlockVideo-preview"
      :type="type"
      :code="code"
    ></video-preview>
  </a>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import DialogManager from '#logic/managers/DialogManager';
import GalleryBlockVideoDialog from './GalleryBlockVideoDialog.vue';
import VideoPreview from './VideoPreview.vue';

export default defineComponent({
  name: 'GalleryBlockVideo',
  components: { VideoPreview },
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
  min-width: 150px;
  --video-preview-stub-min-width: 300px;
  --video-preview-play-size: 100px;
  --video-preview-stub-titled-play-size: 100px;
}

video::-webkit-media-controls {
  display: none !important;
}
</style>

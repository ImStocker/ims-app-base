<template>
  <div class="GalleryBlockVideoDialog">
    <iframe
      v-if="type !== 'extvideo'"
      class="GalleryBlockVideoDialog-video"
      width="800"
      height="500"
      :src="link"
      title="Video player"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
    ></iframe>
    <template v-else>
      <video controls width="800" height="500">
        <source :src="link" />
      </video>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { DialogInterface } from '#logic/managers/DialogManager';

type DialogProps = {
  code: string;
  type: 'extvideo' | 'youtube' | 'vkvideo' | 'rutube';
};

type DialogResult = undefined;

export default defineComponent({
  name: 'GalleryBlockVideoDialog',
  components: {},
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  computed: {
    code() {
      return this.dialog.state.code;
    },
    type() {
      return this.dialog.state.type;
    },
    link() {
      let link = '';
      switch (this.type) {
        case 'youtube':
          link = 'https://www.youtube.com/embed/' + this.code;
          break;
        case 'vkvideo': {
          const [oid, id] = this.code.split('_');
          link = `https://vk.com/video_ext.php?oid=${oid}&id=${id}`;
          break;
        }
        case 'rutube':
          link = 'https://rutube.ru/play/embed/' + this.code;
          break;
        case 'extvideo':
          link = this.code;
          break;
      }
      return link;
    },
  },
});
</script>

<style lang="scss" scoped>
.GalleryBlockVideoDialog-video {
  max-width: 100%;
}
</style>

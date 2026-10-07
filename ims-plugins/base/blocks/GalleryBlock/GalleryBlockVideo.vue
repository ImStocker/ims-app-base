<template>
  <a
    class="GalleryBlockVideo"
    :href="link ?? undefined"
    target="_blank"
    @click.prevent="open"
  >
    <video-preview
      class="GalleryBlockVideo-preview"
      :type="type"
      :code="code"
      :title="file ? file.Title : null"
    ></video-preview>
  </a>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import DialogManager from '#logic/managers/DialogManager';
import EditorManager from '#logic/managers/EditorManager';
import UiManager from '#logic/managers/UiManager';
import {
  type AssetPropValue,
  type AssetPropValueFile,
  castAssetPropValueToString,
} from '#logic/types/Props';
import FilePresenterDialog from '#components/File/FilePresenterDialog.vue';
import { useFilePresenterParams } from '#components/File/FilePresenter';
import GalleryBlockVideoDialog from './GalleryBlockVideoDialog.vue';
import VideoPreview from './VideoPreview.vue';

type ExternalVideoType = 'extvideo' | 'youtube' | 'vkvideo' | 'rutube';

export default defineComponent({
  name: 'GalleryBlockVideo',
  components: { VideoPreview },
  props: {
    value: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    type: {
      type: String as PropType<'file' | ExternalVideoType>,
      default: 'youtube',
    },
  },
  computed: {
    file(): AssetPropValueFile | null {
      if (this.type !== 'file') return null;
      const value = this.value;
      if (!value || typeof value !== 'object' || !('FileId' in value)) {
        return null;
      }
      return value as AssetPropValueFile;
    },
    code(): string {
      const file = this.file;
      if (file) return file.FileId;
      return castAssetPropValueToString(this.value);
    },
    externalType(): ExternalVideoType | null {
      return this.type === 'file' ? null : this.type;
    },
    link(): string | null {
      const file = this.file;
      if (file) return useFilePresenterParams(file).link;
      switch (this.type) {
        case 'youtube':
          return 'https://www.youtube.com/watch?v=' + this.code;
        case 'vkvideo': {
          const [oid, id] = this.code.split('_');
          return `https://vk.com/video${oid}_${id}`;
          // return `https://vk.com/video_ext.php?oid=${oid}&id=${id}`
        }
        case 'rutube':
          return 'https://rutube.ru/video/' + this.code;
        case 'extvideo':
          return this.code;
      }
      return null;
    },
  },
  methods: {
    async open(ev: MouseEvent) {
      const file = this.file;
      if (file) {
        if (ev.ctrlKey || ev.metaKey) {
          await this.$getAppManager()
            .get(UiManager)
            .doTask(async () => {
              await this.$getAppManager()
                .get(EditorManager)
                .downloadAttachment(file);
            });
        } else {
          this.$getAppManager().get(DialogManager).show(FilePresenterDialog, {
            value: file,
          });
        }
        return;
      }

      const type = this.externalType;
      if (!type) return;
      if (ev.ctrlKey || ev.metaKey) {
        if (this.link) window.open(this.link, '_blank');
      } else {
        this.$getAppManager().get(DialogManager).show(GalleryBlockVideoDialog, {
          code: this.code,
          type,
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

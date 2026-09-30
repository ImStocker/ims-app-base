<template>
  <dialog-content
    class="ExternalLinkDialog"
    @escape-press="choose(false)"
    @enter-press="choose(true)"
  >
    <div class="Form">
      <div class="Dialog-header">
        {{
          isImage
            ? $t('assetEditor.galleryBlockAddExternalImageMessage')
            : $t('assetEditor.galleryBlockAddVideoLinkMessage')
        }}
      </div>
      <div class="Dialog-message">
        <FormInput
          :autofocus="true"
          :value="link ?? undefined"
          :placeholder="
            isImage
              ? $t('assetEditor.galleryBlockAddExternalImagePlaceholder')
              : $t('assetEditor.galleryBlockAddVideoLinkPlaceholder')
          "
          @input="link = $event"
        />
      </div>
      <div class="Dialog-message ExternalLinkDialog-preview">
        <img
          v-if="isImage"
          :src="previewLink"
          :class="{ hidden: !fileLoaded }"
          @load="onLoad()"
          @error="onError()"
        />
        <iframe
          v-else-if="itemType !== 'extvideo'"
          class="ExternalLinkDialog-video"
          :class="{ hidden: !fileLoaded }"
          :src="previewLink"
          title="External video player"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
        <video v-else controls :class="{ hidden: !fileLoaded }">
          <source :src="previewLink" @error="onError()" />
        </video>
      </div>
      <div class="Form-row-buttons">
        <div class="Form-row-buttons-center use-buttons-action">
          <button type="button" class="is-button" @click="dialog.close()">
            {{ $t('common.dialogs.cancelCaption') }}
          </button>
          <button
            type="button"
            class="is-button accent"
            :disabled="isDisabled"
            @click="choose(true)"
          >
            {{ $t('common.dialogs.save') }}
          </button>
        </div>
      </div>
    </div>
  </dialog-content>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '#components/Dialog/DialogContent.vue';
import FormInput from '#components/Form/FormInput.vue';
import UiManager from '#logic/managers/UiManager';
import { debounceForThis } from '#components/utils/ComponentUtils';
import {
  parseYoutubeLink,
  parseVkVideoLink,
  parseRutubeVideoLink,
  isExternalVideoValid,
} from '#logic/utils/parseLinks';
import type { DialogInterface } from '#logic/managers/DialogManager';
import type { GalleryBlockItemType } from './GalleryBlock';

export type ExternalLinkKind = 'image' | 'video';

type LinkPreviewType = Exclude<GalleryBlockItemType, 'file'>;

type LinkPreview = {
  itemType: LinkPreviewType;
  value: string;
  previewLink: string;
};

type DialogProps = {
  initialLink?: string;
  linkKind: ExternalLinkKind;
};

type DialogResult = {
  itemType: LinkPreviewType;
  value: string;
} | null;

function parsePreview(link: string, isImage: boolean): LinkPreview | null {
  if (!link.trim()) return null;

  if (isImage) {
    return { itemType: 'extimage', value: link, previewLink: link };
  }
  const yt = parseYoutubeLink(link);
  if (yt) {
    return {
      itemType: 'youtube',
      value: yt,
      previewLink: 'https://www.youtube.com/embed/' + yt,
    };
  }
  const vk = parseVkVideoLink(link);
  if (vk) {
    const [oid, id, hash] = vk.split('_');
    return {
      itemType: 'vkvideo',
      value: vk,
      previewLink:
        `https://vk.com/video_ext.php?oid=${oid}&id=${id}` +
        (hash ? `&hash=${hash}` : ''),
    };
  }
  const rt = parseRutubeVideoLink(link);
  if (rt) {
    return {
      itemType: 'rutube',
      value: rt,
      previewLink: 'https://rutube.ru/play/embed/' + rt,
    };
  }
  if (isExternalVideoValid(link)) {
    return { itemType: 'extvideo', value: link, previewLink: link };
  }
  return null;
}

export default defineComponent({
  name: 'ExternalLinkDialog',
  components: {
    DialogContent,
    FormInput,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  data() {
    return {
      link: this.dialog.state.initialLink ?? '',
      fileLoaded: false as boolean,
    };
  },
  computed: {
    linkKind() {
      return this.dialog.state.linkKind;
    },
    isImage() {
      return this.linkKind === 'image';
    },
    preview(): LinkPreview | null {
      return parsePreview(this.link, this.isImage);
    },
    previewLink(): string | undefined {
      return this.preview?.previewLink;
    },
    itemType(): LinkPreviewType | null {
      return this.preview?.itemType ?? null;
    },
    isDisabled() {
      return !this.fileLoaded;
    },
  },
  watch: {
    link: {
      immediate: true,
      handler() {
        this.fileLoaded = this.isImage ? false : this.preview !== null;
        this.reportWrongVideoLink();
      },
    },
  },
  methods: {
    reportWrongVideoLink: debounceForThis(function (this: any) {
      if (this.link.trim() && !this.isImage && !this.preview) {
        this.$getAppManager()
          .get(UiManager)
          .showError(this.$t('assetEditor.galleryBlockAddVideoLinkWrong'));
      }
    }),
    onLoad() {
      this.fileLoaded = true;
    },
    onError() {
      this.fileLoaded = false;
      if (this.link) {
        try {
          new URL(this.link);
          this.$getAppManager()
            .get(UiManager)
            .showError(
              this.$t(
                this.isImage
                  ? 'assetEditor.galleryBlockAddExternalImageLinkNotFound'
                  : 'assetEditor.galleryBlockAddVideoLinkNotFound',
              ),
            );
        } catch (err: any) {
          console.error(err);
          this.$getAppManager()
            .get(UiManager)
            .showError(
              this.$t(
                this.isImage
                  ? 'assetEditor.galleryBlockAddExternalImageLinkWrong'
                  : 'assetEditor.galleryBlockAddVideoLinkWrong',
              ),
            );
        }
      }
    },
    async choose(ok: boolean) {
      if (!ok) {
        this.dialog.close();
        return;
      }
      const preview = this.preview;
      if (!preview) {
        this.$getAppManager()
          .get(UiManager)
          .showError(
            this.$t('assetEditor.galleryBlockAddExternalImageLinkEmpty'),
          );
        return;
      }
      this.dialog.close({
        itemType: preview.itemType,
        value: preview.value,
      });
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/Form';

.ExternalLinkDialog {
  min-width: 400px;
}

.ExternalLinkDialog-select {
  padding: 4px 0px;
  width: 100px;
  background: white;
  border: 1px solid;
  margin-left: 10px;
}
.ExternalLinkDialog-preview {
  width: 100%;
  height: 180px;
  border-radius: 10px;
  margin: 0 auto 20px;
  overflow: hidden;
  border: 1px solid var(--default-border);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  iframe {
    width: 100%;
    height: 100%;
  }
  video {
    width: 100%;
    height: 100%;
    margin: 0;
  }
}
img {
  &.hidden {
    display: none;
  }
}
iframe {
  &.hidden {
    display: none;
  }
}
video {
  &.hidden {
    display: none;
  }
}
</style>

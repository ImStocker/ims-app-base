<template>
  <dialog-content
    class="ExternalLinkDialog"
    @escape-press="choose(false)"
    @enter-press="choose(true)"
  >
    <div class="Form">
      <div class="Dialog-header">
        {{ header }}
      </div>
      <div v-if="message" class="Dialog-message">
        {{ message }}
      </div>
      <div class="Dialog-message">
        <FormInput
          :autofocus="true"
          :value="dialog.state.value ? dialog.state.value : undefined"
          :placeholder="dialog.state.placeholder"
          @input="value = $event"
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
          v-else-if="type !== 'extvideo'"
          class="ExternalLinkDialog-video"
          :class="{ hidden: !fileLoaded }"
          :src="previewLink"
          title="YouTube video player"
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
          <button
            type="button"
            :value="cancelCaption"
            class="is-button"
            :disabled="busy"
            @click="dialog.close()"
          >
            {{ cancelCaption }}
          </button>
          <button
            type="button"
            class="is-button accent"
            :disabled="isDisabled"
            @click="choose(true)"
          >
            {{ yesCaption }}
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

type DialogProps = {
  value?: string;
  fileType: 'video' | 'image';
  placeholder?: string;
  header?: string;
  message?: string;
  yesCaption?: string;
  cancelCaption?: string;
};

type DialogResult =
  | {
      type: 'youtube' | 'rutube' | 'vkvideo' | 'extvideo';
      value: string;
    }
  | undefined
  | null;

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
      value: null as string | null,
      type: '' as 'youtube' | 'extvideo' | 'vkvideo' | 'rutube',
      previewLink: undefined as string | undefined,
      busy: false,
      fileLoaded: false as boolean,
      code: '' as string,
    };
  },
  computed: {
    fileType() {
      return this.dialog.state.fileType;
    },
    isDisabled() {
      return this.busy || !this.fileLoaded;
    },
    header() {
      return this.dialog.state.header;
    },
    message() {
      return this.dialog.state.message;
    },
    yesCaption() {
      return this.dialog.state.yesCaption
        ? this.dialog.state.yesCaption
        : this.$t('common.dialogs.yes');
    },
    cancelCaption() {
      return this.dialog.state.cancelCaption
        ? this.dialog.state.cancelCaption
        : this.$t('common.dialogs.cancelCaption');
    },
    isImage() {
      return this.fileType === 'image';
    },
  },
  mounted() {
    if (this.dialog.state.value) {
      this.value = this.dialog.state.value;
    }
  },
  methods: {
    getVideoPreviewLink() {
      if (!this.previewLink) {
        return;
      }
      let code = parseYoutubeLink(this.previewLink);
      if (code) {
        this.code = code;
        this.type = 'youtube';
        this.previewLink = 'https://www.youtube.com/embed/' + code;
      } else {
        code = parseVkVideoLink(this.previewLink);
        if (code) {
          const [oid, id, hash] = code.split('_');

          this.previewLink =
            `https://vk.com/video_ext.php?oid=${oid}&id=${id}` +
            (hash ? `&hash=${hash}` : '');
          this.code = code;
          this.type = 'vkvideo';
        } else {
          code = parseRutubeVideoLink(this.previewLink);
          if (code) {
            this.code = code;
            this.type = 'rutube';
            this.previewLink = 'https://rutube.ru/play/embed/' + code;
          } else {
            const valid = isExternalVideoValid(this.value ?? '');
            if (!valid) {
              this.$getAppManager()
                .get(UiManager)
                .showError(
                  this.$t('assetEditor.galleryBlockAddVideoLinkWrong'),
                );
              this.fileLoaded = false;
              return;
            }
            this.type = 'extvideo';
            this.previewLink = this.value ?? '';
          }
        }
      }
      this.fileLoaded = true;
    },
    setPreviewLink: debounceForThis(function (this: any, _link: string) {
      this.updatePreviewLink();
    }),
    updatePreviewLink() {
      this.previewLink = this.value ? this.value : undefined;
      if (!this.previewLink) {
        this.fileLoaded = false;
        return;
      }
      if (!this.isImage) {
        this.getVideoPreviewLink();
      }
    },
    onLoad() {
      this.fileLoaded = true;
    },
    onError() {
      this.fileLoaded = false;
      if (this.value) {
        try {
          new URL(this.value);
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
      if (ok) {
        const val = this.code ? this.code : (this.value ?? '');
        if (!val) {
          this.$getAppManager()
            .get(UiManager)
            .showError(
              this.$t('assetEditor.galleryBlockAddExternalImageLinkEmpty'),
            );
        }
        this.dialog.close({
          type: this.isImage ? 'extimage' : (this.type as any),
          value: val,
        });
      } else {
        this.dialog.close();
      }
    },
  },
  watch: {
    value(newVal) {
      this.setPreviewLink(newVal);
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

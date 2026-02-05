<template>
  <div class="FilePresenterDialog">
    <div class="FilePresenterDialog-container">
      <template v-if="files && files.length > 1">
        <div class="FilePresenterDialog-leftArrow" @click="changeValue('prev')">
          <i class="ri-arrow-left-wide-fill" />
        </div>
        <div
          class="FilePresenterDialog-rightArrow"
          @click="changeValue('next')"
        >
          <i class="ri-arrow-right-wide-fill" />
        </div>
      </template>
      <file-presenter
        v-if="type === 'file'"
        class="FilePresenterDialog-file"
        :value="value"
        :inline="true"
      />

      <!-- <iframe 
      v-else-if="type === 'youtube' || type === 'vkvideo' || type === 'rutube'"
      class="GalleryBlockVideoDialog-video"
      width="800" 
      height="500" 
      :src="link" 
      title="Video player" 
      frameborder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
      allowfullscreen
    ></iframe>
    <video
      v-else-if="type === 'extvideo'"
      controls
      width="800" 
      height="500"
    >
      <source :src="link">
    </video> -->
      <img
        v-else-if="type === 'extimage'"
        :src="itemValueAsString"
        alt=""
        class="FilePresenterDialog-file"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent, type PropType } from 'vue';
import {
  type AssetPropValue,
  type AssetPropValueFile,
  castAssetPropValueToString,
} from '../../logic/types/Props';
import type { DialogInterface } from '../../logic/managers/DialogManager';
import type { GalleryBlockItemObject } from '~ims-plugin-base/blocks/GalleryBlock/GalleryBlock';
import { SharpFit } from '../../logic/utils/files';

type DialogProps = {
  value: AssetPropValue;
  type?: GalleryBlockItemObject['type'];
  files?: AssetPropValue[];
};

type DialogResult = undefined;

export default defineComponent({
  name: 'FilePresenterDialog',
  components: {
    FilePresenter: defineAsyncComponent(
      () => import('./FilePresenter.vue') as any,
    ),
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  data() {
    return {
      value: this.dialog.state.value,
      type: this.dialog.state.type ?? 'file',
      thumbParams: {
        width: 1920,
        height: 1080,
        fit: SharpFit.COVER,
      },
    };
  },
  computed: {
    link() {
      let link = '';
      if (typeof this.value !== 'string') return link;
      switch (this.type) {
        case 'youtube':
          link = 'https://www.youtube.com/embed/' + this.value;
          break;
        case 'vkvideo': {
          const [oid, id] = this.value.split('_');
          link = `https://vk.com/video_ext.php?oid=${oid}&id=${id}`;
          break;
        }
        case 'rutube':
          link = 'https://rutube.ru/play/embed/' + this.value;
          break;
        case 'extvideo':
          link = this.value;
          break;
      }
      return link;
    },
    files() {
      // return this.dialog.state.files?.filter((file) => file.type === 'file' || file.type === 'extimage')
      if (!this.dialog.state.files) return null;
      return [...this.dialog.state.files];
    },
    itemValueAsString() {
      return castAssetPropValueToString(this.value);
    },
  },
  watch: {},
  mounted() {
    window.addEventListener('keydown', this.handleKeydown);
    window.addEventListener('click', this.handleClick);
  },
  unmounted() {
    window.removeEventListener('keydown', this.handleKeydown);
    window.removeEventListener('click', this.handleClick);
  },
  methods: {
    handleClick(ev: MouseEvent) {
      if (
        (ev.target as HTMLElement).classList.contains(
          'FilePresenterDialog-container',
        )
      ) {
        this.dialog.close();
      }
    },
    handleKeydown(event: KeyboardEvent) {
      switch (event.key) {
        case 'ArrowLeft':
          this.changeValue('prev');
          break;
        case 'ArrowRight':
          this.changeValue('next');
          break;
        case 'Escape':
          this.dialog.close();
          break;
      }
    },
    changeValue(to: 'prev' | 'next') {
      if (this.files && this.files.length > 0) {
        const index = this.files.findIndex(
          (file) =>
            (file as AssetPropValueFile).FileId ===
            (this.value as AssetPropValueFile).FileId,
        );

        if (to === 'prev') {
          if (index === 0) {
            this.value = this.files[this.files.length - 1];
            // this.type = this.files[this.files.length - 1];
          } else {
            this.value = this.files[index - 1];
            // this.type = this.files[index - 1]?.type;
          }
        } else {
          if (index === this.files.length - 1) {
            this.value = this.files[0];
            // this.type = this.files[0]?.type
          } else {
            this.value = this.files[index + 1];
            // this.type = this.files[index + 1]?.type
          }
        }
      }
    },
  },
});
</script>

<style lang="scss" scoped>
@use '$style/devices-mixins.scss';

.FilePresenterDialog {
  width: 100vw;

  @include devices-mixins.device-type(not-pc) {
    width: auto;
  }
}

.FilePresenterDialog-container {
  display: flex;
  justify-content: center;
}

.FilePresenterDialog-leftArrow,
.FilePresenterDialog-rightArrow {
  position: absolute;
  font-size: 60px;
  cursor: pointer;
  top: 50%;
  transform: translate(0, -50%);
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  opacity: 0.2;
  transition: opacity 0.2s ease-in-out;

  &:hover {
    opacity: 1;
  }

  @include devices-mixins.device-type(not-pc) {
    font-size: 30px;
  }
}

.FilePresenterDialog-leftArrow {
  left: 20px;

  @include devices-mixins.device-type(not-pc) {
    left: 10px;
  }
}

.FilePresenterDialog-rightArrow {
  right: 20px;

  @include devices-mixins.device-type(not-pc) {
    right: 10px;
  }
}

.FilePresenterDialog-file {
  max-width: 95vw;
  max-height: 95vh;
  &:deep(audio) {
    width: 600px;
    max-width: 100%;
  }
}

iframe.FilePresenterDialog-file.type-ext-pdf {
  width: 95vw;
  height: 95vh;
}
</style>

<template>
  <div class="AttacmentPropEditor">
    <file-presenter
      v-if="isFilled"
      class="AttacmentPropEditor-value"
      :inline="false"
      :value="modelValue"
      :menu-list="disable ? [] : fileMenu"
    ></file-presenter>
    <file-attach-button
      v-show="!isFilled"
      ref="attach"
      :accept="accept"
      :disable="disable"
      class="AttacmentPropEditor-fileAttach"
      @uploaded-one="onUploaded"
    >
      {{ title ? title : $t('file.selectFile') }}
    </file-attach-button>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import DialogManager from '../../logic/managers/DialogManager';
import type {
  AssetPropValue,
  AssetPropValueFile,
} from '../../logic/types/Props';
import { isFilledAssetPropValue } from '../../logic/types/Props';
import ConfirmDialog from '../Common/ConfirmDialog.vue';
import FileAttachButton from '../File/FileAttachButton.vue';
import FilePresenter from '../File/FilePresenter.vue';
import type { UploadingJob } from '../../logic/managers/EditorManager';

export default defineComponent({
  name: 'AttachmentPropEditor',
  components: {
    FilePresenter,
    FileAttachButton,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    accept: { type: String, default: '' },
    title: { type: String, default: '' },
    disable: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'blur'],
  data() {
    return {
      uploadingJob: null as UploadingJob | null,
    };
  },
  computed: {
    isFilled() {
      return isFilledAssetPropValue(this.modelValue);
    },
    fileMenu() {
      return [
        {
          title: this.$t('file.replaceFile'),
          icon: 'ri-loop-right-fill',
          action: () => {
            if (!this.$refs['attach']) return;
            (
              this.$refs['attach'] as InstanceType<typeof FileAttachButton>
            ).attach();
          },
        },
        {
          title: this.$t('file.dettachFile'),
          icon: 'ri-unpin-fill',
          danger: true,
          action: () => this.detachFile(),
        },
      ];
    },
  },
  mounted() {},
  methods: {
    emitValueFromEvent(event: Event) {
      this.$emit('update:modelValue', event);
    },
    onUploaded(res: AssetPropValueFile) {
      this.$emit('update:modelValue', res);
    },
    async detachFile() {
      if (!this.modelValue) {
        return;
      }
      const res = await this.$getAppManager()
        .get(DialogManager)
        .show(
          ConfirmDialog,
          {
            header: this.$t('file.dettachFile'),
            message: this.$t('file.dettachFileConfirmation'),
            danger: true,
          },
          this,
        );
      if (res) {
        this.$emit('update:modelValue', null);
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.AttacmentPropEditor {
  padding: 5px;
  display: flex;
  align-items: center;
}

.AttacmentPropEditor-fileAttach {
  padding: 0;
}

.AttacmentPropEditor-value {
  margin-right: 10px;
  user-select: none;
}
.AttacmentPropEditor-value {
  min-width: 100px;
}
.AttacmentPropEditor-attach-progress-cancel {
  background: transparent;
  border: none;
  color: #ccc;
  cursor: pointer;
  padding: 0;
  &:hover {
    color: var(--text-intense);
  }
}
.AttacmentPropEditor-attach-button,
.AttacmentPropEditor-attach-progress {
  padding: 5px 5px 5px 5px !important;
  width: 150px;
  text-align: center;
  box-sizing: border-box;
  display: inline-block;
  user-select: none;
}

.AttacmentPropEditor-attach-progress {
  color: #ccc;
  border: 1px solid #ccc;
  font-weight: 500;
  border-radius: 4px;
}
</style>

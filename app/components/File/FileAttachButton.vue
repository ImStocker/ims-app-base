<template>
  <div class="FileAttachButton">
    <template v-if="displayMode === 'button'">
      <label
        v-if="uploadingPercent === null"
        class="is-button is-button-normal"
      >
        <input
          v-if="!disable"
          ref="file"
          type="file"
          :accept="accept"
          style="display: none"
          :multiple="multiple"
          @change="handleFile"
        />
        <i class="ri-file-search-fill" />
        <slot>{{ $t('file.selectFile') }}</slot>
      </label>
      <span v-else class="FileAttachButton-attach-progress">
        {{ $t('file.uploading') }} ({{ uploadingPercent }}%)
        <button
          class="FileAttachButton-attach-progress-cancel"
          :title="$t('file.cancelUpload')"
          @click="cancelUpload"
        >
          <i class="ri-close-line" />
        </button>
      </span>
    </template>
    <template v-else>
      <label class="button FileAttachButton-attach-button">
        <input
          v-if="!disable"
          type="file"
          :accept="accept"
          style="display: none"
          :multiple="multiple"
          @change="handleFile"
        />
        <i class="ri-attachment-2" />
      </label>
    </template>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import DialogManager from '../../logic/managers/DialogManager';
import UiManager from '../../logic/managers/UiManager';
import type { AssetPropValueFile } from '../../logic/types/Props';
import ConfirmDialog from '../Common/ConfirmDialog.vue';
import type { UploadingJob } from '../../logic/managers/EditorManager';
import EditorManager from '../../logic/managers/EditorManager';

export default defineComponent({
  name: 'FileAttachButton',
  components: {},
  props: {
    multiple: { type: Boolean, default: false },
    accept: { type: String, default: '' },
    displayMode: {
      type: String as PropType<'button' | 'icon'>,
      default: 'button',
    },
    disable: { type: Boolean, default: false },
  },
  emits: ['uploadedAll', 'uploadedOne', 'blur'],
  data() {
    return {
      uploadingJob: null as UploadingJob | null,
      uploadingTotal: 0,
      uploadingDone: 0,
    };
  },
  computed: {
    uploadingPercent() {
      if (!this.uploadingJob) return null;
      const overall_progress =
        (this.uploadingDone + this.uploadingJob.progress) / this.uploadingTotal;

      return Math.round(overall_progress);
    },
  },
  mounted() {},
  methods: {
    attach() {
      if (!this.$refs['file']) return;
      (this.$refs['file'] as HTMLInputElement).click();
    },
    async handleFile(e: any) {
      let files: File[] = [];
      if (e.target && e.target.files) {
        files = [...e.target.files];
        e.target.value = null;
      } else if (e.dataTransfer && e.dataTransfer.files)
        files = [...e.dataTransfer.files];
      else if (
        this.$refs.dropzoneFile &&
        (this.$refs.dropzoneFile as any).files
      )
        files = [...(this.$refs.dropzoneFile as any).files];

      e.target.value = '';

      this.uploadingDone = 0;
      this.uploadingTotal = files.length;
      const all_res: AssetPropValueFile[] = [];
      for (const file of files) {
        this.uploadingJob = this.$getAppManager()
          .get(EditorManager)
          .attachFile(file, file.name);
        await this.uploadingJob.awaitResult().then(
          (res) => {
            this.uploadingJob = null;
            if (res) {
              all_res.push(res);
              this.$emit('uploadedOne', res);
            }
          },
          (err) => {
            this.uploadingJob = null;
            this.$getAppManager().get(UiManager).showError(err);
          },
        );
        this.uploadingDone++;
      }
      this.$emit('uploadedAll', all_res);
    },
    async cancelUpload() {
      if (!this.uploadingJob) {
        return;
      }
      const res = await this.$getAppManager()
        .get(DialogManager)
        .show(ConfirmDialog, {
          header: this.$t('file.cancelUpload'),
          message: this.$t('file.cancelUploadConfirmation'),
        });
      if (res) {
        this.uploadingJob.cancel();
        this.uploadingJob = null;
        this.uploadingTotal = 0;
        this.uploadingDone = 0;
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.FileAttachButton {
  padding: 5px;
  display: flex;
  align-items: center;
}

.FileAttachButton-value {
  margin-right: 10px;
  user-select: none;
}
.FileAttachButton-attach-progress-cancel {
  background: transparent;
  border: none;
  color: #ccc;
  cursor: pointer;
  &:hover {
    color: var(--text-intense);
  }
}
.FileAttachButton-attach-progress {
  padding: 5px 5px 5px 5px !important;
  width: 150px;
  text-align: center;
  box-sizing: border-box;
  display: inline-block;
  user-select: none;
}

.FileAttachButton-attach-progress {
  color: #ccc;
  border: 1px solid #ccc;
  font-weight: 500;
  border-radius: 4px;
  white-space: nowrap;
}
.ri-file-search-fill {
  margin-right: 5px;
}
</style>

<template>
  <span
    v-if="isEditor && uploadingJobObject && !done"
    class="ImcTextUploadJob"
    :title="tooltip"
  >
    <span class="ImcTextUploadJob-spinner loaderSpinner"></span>
    <span class="ImcTextUploadJob-percent">{{ uploadingPercent }}%</span>
  </span>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import './quill-init';
import type { UploadingJob } from '../../logic/managers/EditorManager';
import EditorManager from '../../logic/managers/EditorManager';

type UploadJobInfo = {
  uploadId: string;
  inline: boolean;
};

export default defineComponent({
  name: 'ImcTextUploadJob',
  components: {},
  props: {
    uploadJob: {
      type: Object as PropType<UploadJobInfo>,
      required: true,
    },
    isEditor: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    uploadingJobObject(): UploadingJob | undefined {
      return this.$getAppManager()
        .get(EditorManager)
        .getUploadJob(this.uploadJob.uploadId);
    },
    uploadingPercent() {
      if (!this.uploadingJobObject) return 0;
      return Math.round(this.uploadingJobObject.progress * 100);
    },
    tooltip() {
      if (!this.uploadingJobObject) return '';
      return this.uploadingJobObject.title + '\n' + this.$t('file.uploading');
    },
    done() {
      return (
        this.uploadingJobObject &&
        (this.uploadingJobObject.result !== undefined ||
          this.uploadingJobObject.error)
      );
    },
  },
});
</script>

<style lang="scss" scoped>
.ImcTextUploadJob {
  border: 1px solid var(--local-border-color);
  padding: 5px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
}
.ImcTextUploadJob-spinner {
  font-size: 12px;
  margin: 0;
  margin-right: 5px;
  --loader-spinner-color2: var(--local-sub-text-color);
}
.ImcTextUploadJob-percent {
  color: var(--local-link-color);
  width: 40px;
  text-align: center;
  white-space: nowrap;
}
</style>

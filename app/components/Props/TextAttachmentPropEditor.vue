<template>
  <div class="TextAttachmentPropEditor">
    <imc-editor
      class="TextAttachmentPropEditor-input"
      :model-value="modelValue"
      :placeholder="placeholder"
      @update:model-value="emitValueFromEvent($event)"
    ></imc-editor>
    <file-attach-button
      :multiple="true"
      class="TextAttachmentPropEditor-file"
      @uploaded-one="attachFile($event)"
    ></file-attach-button>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type {
  AssetPropValue,
  AssetPropValueFile,
} from '../../logic/types/Props';
import {
  isFilledAssetPropValue,
  joinAssetPropValueTexts,
} from '../../logic/types/Props';
import FileAttachButton from '../File/FileAttachButton.vue';
import ImcEditor from '../ImcText/ImcEditor.vue';
import type { UploadingJob } from '../../logic/managers/EditorManager';

export default defineComponent({
  name: 'TextAttachmentPropEditor',
  components: {
    ImcEditor,
    FileAttachButton,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    placeholder: { type: String, default: '' },
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
  },
  mounted() {},
  methods: {
    emitValueFromEvent(event: Event) {
      this.$emit('update:modelValue', event);
    },
    attachFile(file: AssetPropValueFile) {
      if (!file) return;
      let res = this.modelValue;
      if (res) {
        res = joinAssetPropValueTexts(res, file);
      } else res = file;
      this.$emit('update:modelValue', res);
    },
  },
});
</script>

<style lang="scss" scoped>
.TextAttachmentPropEditor {
  display: flex;
  flex-wrap: wrap;
}
.TextAttachmentPropEditor-input {
  flex: 1;
}
</style>

<template>
  <div class="AttachmentPropPresenter">
    <file-presenter
      class="AttachmentPropPresenter-file"
      :value="modelValue"
      :inline="false"
    ></file-presenter>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import { castAssetPropValueToString } from '../../logic/types/Props';
import FilePresenter from '../File/FilePresenter.vue';

export default defineComponent({
  name: 'AttachmentPropPresenter',
  components: {
    FilePresenter,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
  },
  emits: ['update:modelValue', 'blur'],
  computed: {
    valueAsText() {
      return castAssetPropValueToString(this.modelValue);
    },
  },
  mounted() {},
  methods: {},
});
</script>

<style lang="scss" scoped>
.AttachmentPropPresenter {
  padding: 5px;
}
.AttachmentPropPresenter-file {
  max-width: 100%;
}
</style>

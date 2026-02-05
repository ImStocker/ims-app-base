<template>
  <div class="FormSelectFile">
    <div class="FormSelectFile-label">
      {{ label }}:
      <FormBuilderFieldTooltip
        v-if="tooltip"
        class="FormSelectFile-tooltip-mobile"
        :message="tooltip"
      />
    </div>
    <attachment-prop-editor
      :model-value="modelValue"
      @update:model-value="$emit('update:model-value', $event)"
    ></attachment-prop-editor>
    <FormBuilderFieldTooltip
      v-if="tooltip"
      class="FormSelectFile-tooltip"
      :message="tooltip"
    />
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import AttachmentPropEditor from '../../components/Props/AttachmentPropEditor.vue';
import type { AssetPropValueFile } from '../../logic/types/Props';
import FormBuilderFieldTooltip from './FormBuilderFieldTooltip.vue';

export default defineComponent({
  name: 'FormSelectFile',
  components: {
    AttachmentPropEditor,
    FormBuilderFieldTooltip,
  },
  props: {
    modelValue: {
      type: Object as PropType<AssetPropValueFile>,
      default: null,
    },
    label: {
      type: String,
      required: true,
    },
    tooltip: {
      type: String,
      default: null,
    },
  },
  emits: ['update:model-value'],
});
</script>

<style lang="scss" scoped>
@use '$style/devices-mixins.scss';

.FormSelectFile {
  display: flex;
  gap: 20px;
  align-items: center;

  @include devices-mixins.device-type(not-pc) {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
.FormSelectFile-label {
  @include devices-mixins.device-type(not-pc) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
}
:deep(.AttacmentPropEditor),
:deep(.FileAttachButton) {
  padding: 0px;
}
.FormSelectFile-tooltip-mobile {
  display: none;

  @include devices-mixins.device-type(not-pc) {
    display: flex;
  }
}
.FormSelectFile-tooltip {
  display: block;

  @include devices-mixins.device-type(not-pc) {
    display: none;
  }
}
</style>

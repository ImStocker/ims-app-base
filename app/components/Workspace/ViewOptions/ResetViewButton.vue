<template>
  <div class="ResetViewButton">
    <button class="is-button ResetViewButton-button" @click="$emit('reset')">
      <i class="ri-arrow-go-back-line"></i>
      <caption-string :value="$t('viewSettings.resetChanges')"></caption-string>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import CaptionString from '../../Common/CaptionString.vue';

export default defineComponent({
  name: 'ResetViewButton',
  components: {
    CaptionString,
  },
  emits: ['reset'],
});
</script>

<style lang="scss" scoped>
@use './viewToolbarButton';

.ResetViewButton {
  @include viewToolbarButton.view-toolbar-buttons('ResetViewButton');
}
</style>

<template>
  <div class="SaveViewButton">
    <button
      class="is-button is-button-action accent SaveViewButton-button"
      @click="$emit('save')"
    >
      <i class="ri-save-3-line"></i>
      <caption-string :value="$t('viewSettings.saveView')"></caption-string>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import CaptionString from '../../Common/CaptionString.vue';

export default defineComponent({
  name: 'SaveViewButton',
  components: {
    CaptionString,
  },
  emits: ['save'],
});
</script>

<style lang="scss" scoped>
@use './viewToolbarButton';

.SaveViewButton {
  @include viewToolbarButton.view-toolbar-accent-button(
    'SaveViewButton-button'
  );
}
</style>

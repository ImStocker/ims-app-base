<template>
  <menu-button class="FormBuilderFieldTooltip">
    <template #button="{ toggle }">
      <button class="is-button is-button-icon-small" @click="toggle">
        <i class="ri-question-fill"></i>
      </button>
    </template>
    <div class="FormBuilderFieldTooltipButton-dropdown is-dropdown">
      <imc-presenter :value="message"></imc-presenter>
    </div>
  </menu-button>
</template>

<script type="text/ecmascript-6" lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import ImcPresenter from '../ImcText/ImcPresenter.vue';
import MenuButton from '../Common/MenuButton.vue';
export default defineComponent({
  name: 'FormBuilderFieldTooltip',
  components: {
    ImcPresenter,
    MenuButton,
  },
  props: {
    message: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      required: true,
    },
    size: {
      type: String,
      default: () => 'lg',
    },
  },
  computed: {},
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.FormBuilderFieldTooltip {
  height: fit-content;
  width: fit-content;
  margin-top: auto;
  margin-bottom: auto;
  display: inline-flex;

  .is-button {
    --button-font-size: 20px;
  }
}
.FormBuilderFieldTooltipButton-dropdown {
  width: 300px;
  --local-font-size: 14px;
  font-size: var(--local-font-size);
  color: var(--local-text-color);
  padding: 10px;
}
</style>

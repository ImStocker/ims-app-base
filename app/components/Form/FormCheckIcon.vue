<template>
  <menu-button
    v-model:shown="dropdownShown"
    class="FormCheckIcon"
    :attach-position="'left'"
  >
    <template #button="{ toggle }">
      <button class="is-button is-button-icon-outlined" @click="toggle">
        <i
          :class="[
            'asset-icon-' + (value ? value : 'file-fill'),
            'FormCheckIcon-button',
          ]"
        ></i>
      </button>
    </template>
    <select-asset-icon-dropdown-content
      :value="value"
      @input="onSelected($event)"
    ></select-asset-icon-dropdown-content>
  </menu-button>
</template>

<script type="text/ecmascript-6" lang="ts">
import { defineComponent } from 'vue';
import MenuButton from '../Common/MenuButton.vue';
import SelectAssetIconDropdownContent from '../Asset/SelectAssetIconDropdownContent.vue';

export default defineComponent({
  name: 'FormCheckIcon',
  components: {
    MenuButton,
    SelectAssetIconDropdownContent,
  },
  props: {
    value: { type: String, default: undefined },
    keyProp: { type: String, default: 'value' },
    titleProp: { type: String, default: 'title' },
    clearable: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
  },
  emits: ['input'],
  data() {
    return {
      dropdownShown: false,
    };
  },
  methods: {
    onSelected(item: string) {
      this.dropdownShown = false;
      this.$emit('input', item);
    },
  },
});
</script>
<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/asset-icons';

.FormCheckIcon-button {
  @include asset-icons.asset-icons;
}
.FormCheckIcon-dropdown {
  overflow-x: hidden;
  display: grid;
  grid-template-columns: repeat(16, 1fr);
}
</style>

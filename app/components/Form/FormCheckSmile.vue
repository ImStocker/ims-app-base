<template>
  <menu-button
    v-model:shown="dropdownShown"
    class="FormCheckSmile use-buttons-icon-rounded"
  >
    <template #button="{ show }">
      <div
        v-if="value"
        class="is-button"
        :class="{
          [`type-${value.toLowerCase()}`]: true,
        }"
      >
        {{ getLikeEmoji(value) }}
      </div>
      <button v-else class="is-button" @click="show()">
        <i class="ri-user-smile-line"></i>
      </button>
    </template>
    <select-smile-dropdown-content
      :value="value"
      :selected-likes-dict="selectedLikesDict"
      @input="onSelected($event)"
    ></select-smile-dropdown-content>
  </menu-button>
</template>

<script type="text/ecmascript-6" lang="ts">
import { getLikeEmoji } from '#logic/constants';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import MenuButton from '../Common/MenuButton.vue';
import SelectSmileDropdownContent from './SelectSmileDropdownContent.vue';

export default defineComponent({
  name: 'FormCheckSmile',
  components: {
    MenuButton,
    SelectSmileDropdownContent,
  },
  props: {
    value: { type: String, default: undefined },
    keyProp: { type: String, default: 'value' },
    titleProp: { type: String, default: 'title' },
    clearable: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    selectedLikesDict: {
      type: Object as PropType<{ [like: string]: boolean }>,
      default: () => ({}),
    },
  },
  emits: ['input', 'change-dropdown-state'],
  data() {
    return {
      dropdownShown: false,
    };
  },
  watch: {
    dropdownShown() {
      this.$emit('change-dropdown-state', this.dropdownShown);
    },
  },
  methods: {
    onSelected(item: string) {
      this.$emit('input', item);
      this.dropdownShown = false;
    },
    getLikeEmoji,
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped></style>

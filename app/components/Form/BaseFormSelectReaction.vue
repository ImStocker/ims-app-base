<template>
  <menu-button
    v-if="!loading"
    v-model:shown="dropdownShown"
    class="BaseFromSelectReaction use-buttons-icon-rounded"
  >
    <template #button="{ show }">
      <div
        v-if="value"
        class="is-button"
        :class="{
          [`type-${value.toLowerCase()}`]: true,
        }"
      >
        {{ getReactionView ? getReactionView(value) : value }}
      </div>
      <button v-else class="is-button" @click="show()">
        <i class="ri-user-smile-line"></i>
      </button>
    </template>
    <slot></slot>
  </menu-button>
  <button v-else class="is-button loading"></button>
</template>

<script type="text/ecmascript-6" lang="ts">
import { getLikeEmoji } from '#logic/constants';
import { defineComponent, type PropType } from 'vue';
import MenuButton from '../Common/MenuButton.vue';

export default defineComponent({
  name: 'BaseFromSelectReaction',
  components: {
    MenuButton,
  },
  props: {
    value: { type: String, default: undefined },
    clearable: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    loading: {
      type: Boolean,
      default: false,
    },
    getReactionView: {
      type: Function as PropType<(item) => string | undefined>,
      default: null,
    },
  },
  emits: ['dropdown-state-change', 'select'],
  data() {
    return {
      dropdownShown: false,
    };
  },
  watch: {
    dropdownShown() {
      this.$emit('dropdown-state-change', this.dropdownShown);
    },
  },
  methods: {
    getLikeEmoji,
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.is-button.loading {
  font-size: 10px;
  width: 27px;
  height: 27px;
}
</style>

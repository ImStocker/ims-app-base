<template>
  <base-form-select-reaction
    :value="value"
    :loading="loading"
    @dropdown-state-change="$emit('dropdown-state-change', $event)"
  >
    <select-smile-dropdown-content
      :selected-smiles="selectedSmiles"
      @select="$emit('select', $event)"
    ></select-smile-dropdown-content>
  </base-form-select-reaction>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import BaseFormSelectReaction from './BaseFormSelectReaction.vue';
import SelectSmileDropdownContent from './SelectSmileDropdownContent.vue';
import { getLikeEmoji } from '../../logic/constants';

export default defineComponent({
  name: 'FormSelectSmile',
  components: {
    BaseFormSelectReaction,
    SelectSmileDropdownContent,
  },
  props: {
    value: {
      type: String,
      default: undefined,
    },
    selectedSmiles: {
      type: Set,
      default: null,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['select', 'dropdown-state-change'],
  methods: {
    getLikeEmoji,
  },
});
</script>

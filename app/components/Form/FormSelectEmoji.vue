<template>
  <base-form-select-reaction
    :value="value"
    :loading="loading"
    @dropdown-state-change="$emit('dropdown-state-change', $event)"
  >
    <select-emoji-dropdown-content
      :selected-emojis="selectedEmojis"
      @select="$emit('select', $event)"
    ></select-emoji-dropdown-content>
  </base-form-select-reaction>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import BaseFormSelectReaction from './BaseFormSelectReaction.vue';
import SelectEmojiDropdownContent from './SelectEmojiDropdownContent.vue';

export default defineComponent({
  name: 'FormSelectEmoji',
  components: {
    BaseFormSelectReaction,
    SelectEmojiDropdownContent,
  },
  props: {
    value: {
      type: String,
      default: null,
    },
    selectedEmojis: {
      type: Set,
      default: null,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['select', 'dropdown-state-change'],
});
</script>

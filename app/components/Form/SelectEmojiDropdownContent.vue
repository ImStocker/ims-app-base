<template>
  <base-select-reaction-dropdown-content
    :reactions="emojis"
    :selected-reactions="selectedEmojis"
    @select="$emit('select', $event)"
  ></base-select-reaction-dropdown-content>
</template>
<script lang="ts">
import { reactionEmojis } from '#logic/constants';
import { defineComponent } from 'vue';
import BaseSelectReactionDropdownContent from './BaseSelectReactionDropdownContent.vue';

export default defineComponent({
  name: 'SelectEmojiDropdownContent',
  components: {
    BaseSelectReactionDropdownContent,
  },
  props: {
    selectedEmojis: {
      type: Set,
      default: null,
    },
  },
  emits: ['select'],
  computed: {
    emojis() {
      return reactionEmojis;
    },
  },
});
</script>

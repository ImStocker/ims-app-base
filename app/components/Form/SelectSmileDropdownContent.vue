<template>
  <div class="SelectSmileDropdownContent is-dropdown use-buttons-dropdown-item">
    <button
      v-for="icon in icons"
      :key="icon"
      :class="{
        selected:
          selectedLikesDict.hasOwnProperty(icon) && selectedLikesDict[icon],
      }"
      class="is-button SelectSmileDropdownContent-item"
      @click="onClick(icon)"
    >
      {{ getLikeEmoji(icon) }}
    </button>
  </div>
</template>
<script lang="ts">
import { getLikeEmoji, likeIcons } from '#logic/constants';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'SelectSmileDropdownContent',
  props: {
    value: {
      type: String,
      default: null,
    },
    selectedLikesDict: {
      type: Object as PropType<{ [like: string]: boolean }>,
      default: () => ({}),
    },
  },
  emits: ['input'],
  computed: {
    icons() {
      return likeIcons;
    },
  },
  methods: {
    dispatchMenuActionExecutedEvent() {
      if (!this.$el) return;
      const imcMenuActionExecuted = new CustomEvent(
        'imc-menu-action-executed',
        {
          bubbles: true,
          detail: { item: undefined },
        },
      );
      this.$el.dispatchEvent(imcMenuActionExecuted);
    },
    onClick(icon: string) {
      this.$emit('input', icon);
      this.dispatchMenuActionExecutedEvent();
    },
    getLikeEmoji,
  },
});
</script>
<style lang="scss" scoped>
.SelectSmileDropdownContent {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}
.SelectSmileDropdownContent-item {
  --button-text-color: #f20000 !important;
  &:nth-child(4) {
    --button-border-radius: 0px var(--dropdown-border-radius) 0px 0px !important;
  }
  &:nth-child(4n):last-child {
    --button-border-radius: 0px 0px var(--dropdown-border-radius) 0px !important;
  }
  &:first-child {
    --button-border-radius: var(--dropdown-border-radius) 0px 0px 0px !important;
  }
  &:nth-child(1n):last-child {
    --button-border-radius: 0px 0px 0px var(--dropdown-border-radius) !important;
  }

  &.selected {
    --button-bg-color: var(--dropdown-hl-bg-color);
  }
}
</style>

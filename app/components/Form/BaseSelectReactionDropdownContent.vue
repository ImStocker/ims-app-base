<template>
  <div
    class="BaseSelectReactionDropdownContent is-dropdown use-buttons-dropdown-item"
  >
    <button
      v-for="item of reactions"
      :key="item"
      :class="{
        selected: selectedReactions ? selectedReactions.has(item) : false,
      }"
      class="is-button BaseSelectReactionDropdownContent-item"
      @click="onClick(item)"
    >
      {{ getReactionView ? getReactionView(item) : item }}
    </button>
  </div>
</template>
<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'BaseSelectReactionDropdownContent',
  props: {
    value: {
      type: String,
      default: null,
    },
    selectedReactions: {
      type: Set,
      default: null,
    },
    reactions: {
      type: Array as PropType<any>,
      required: true,
    },
    getReactionView: {
      type: Function as PropType<(item) => string | undefined>,
      default: null,
    },
  },
  emits: ['select'],
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
    onClick(reaction: any) {
      this.$emit('select', reaction);
      this.dispatchMenuActionExecutedEvent();
    },
  },
});
</script>
<style lang="scss" scoped>
.BaseSelectReactionDropdownContent {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}
.BaseSelectReactionDropdownContent-item {
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

<template>
  <div class="SomeEditorListItem" :class="{ 'state-opened': opened }">
    <div class="SomeEditorListItem-main">
      <i v-if="!readonly" class="SomeEditorListItem-drag ri-draggable"></i>
      <div class="SomeEditorListItem-main-content">
        <slot name="item-main"></slot>
      </div>
      <button
        v-if="$slots['item-advanced']"
        class="SomeEditorListItem-arrow"
        @click="opened = !opened"
      >
        <i class="ri-arrow-down-s-line"></i>
      </button>
    </div>
    <div
      v-if="opened && $slots['item-advanced']"
      class="SomeEditorListItem-advanced"
    >
      <slot name="item-advanced"></slot>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'SomeEditorListItem',
  components: {},
  props: {
    item: {
      type: Object,
      required: true,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      opened: false,
    };
  },
  computed: {},
});
</script>
<style lang="scss" scoped>
.SomeEditorListItem {
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease;

  &:hover {
    background: color-mix(in srgb, var(--local-border-color) 20%, transparent);
    border-color: var(--local-border-color);

    .SomeEditorListItem-drag {
      opacity: 1;
      color: var(--local-sub-text-color);
    }
  }

  &.state-opened {
    border-color: var(--local-border-color);
  }
}
.SomeEditorListItem-drag {
  flex: none;
  opacity: 0;
  cursor: grab;
  color: transparent;
  transition:
    color 0.16s ease,
    opacity 0.16s ease;

  i {
    font-size: 16px;
  }

  &:active {
    cursor: grabbing;
  }
}
.SomeEditorListItem-main {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
}
.SomeEditorListItem-main-content {
  flex: 1;
  min-width: 0;
}
.SomeEditorListItem-arrow {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--local-sub-text-color);
  transition:
    color 0.16s ease,
    background-color 0.16s ease;

  &:hover {
    color: var(--local-text-color);
  }

  > i {
    display: block;
    line-height: 1;
    font-size: 18px;
    transition: transform 0.2s;
  }
}
.SomeEditorListItem.state-opened {
  .SomeEditorListItem-arrow > i {
    transform: rotate(180deg);
  }
}
.SomeEditorListItem-advanced {
  border-top: 1px solid var(--local-border-color);
  margin-top: 4px;
  padding: 12px 10px 10px;
}
</style>

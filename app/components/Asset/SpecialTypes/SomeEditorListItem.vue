<template>
  <div class="SomeEditorListItem is-box" :class="{ 'state-opened': opened }">
    <div class="SomeEditorListItem-main">
      <i v-if="!readonly" class="SomeEditorListItem-drag ri-draggable"></i>
      <div class="SomeEditorListItem-main-content">
        <slot name="item-main"></slot>
      </div>
      <button
        v-if="$slots['item-advanced']"
        class="SomeEditorListItem-arrow is-button is-button-icon"
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
.SomeEditorListItem-drag {
  opacity: 0;
  cursor: grab;
  color: var(--local-sub-text-color);
}
.SomeEditorListItem {
  border-radius: var(--panel-border-radius);
  &:hover {
    .SomeEditorListItem-drag {
      opacity: 1;
    }
  }
}
.SomeEditorListItem-main {
  display: flex;
  padding: 8px 8px;
}
.SomeEditorListItem-main-content {
  flex: 1;
}
.SomeEditorListItem-arrow > i {
  transition: transform 0.2s;
}
.SomeEditorListItem.state-opened {
  .SomeEditorListItem-arrow > i {
    transform: rotate(180deg);
  }
}
.SomeEditorListItem-advanced {
  border-top: 1px solid var(--local-border-color);
  margin-top: 4px;
  padding: 8px 8px;
}
</style>

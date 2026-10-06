<template>
  <div
    v-if="shown"
    class="SegmentedTabs tiny-scrollbars"
    :class="'SegmentedTabs-variant-' + variant"
    role="tablist"
    aria-orientation="horizontal"
  >
    <button
      v-for="(item, index) of visibleItems"
      :key="item.key"
      type="button"
      role="tab"
      class="is-button SegmentedTabs-item"
      :class="{
        'state-active': isActive(item),
        accent: isActive(item) && variant === 'accent',
      }"
      :aria-selected="isActive(item)"
      :tabindex="isTabbable(item, index) ? 0 : -1"
      @click="select(item)"
      @keydown="onKeydown($event, index)"
    >
      <slot name="item" :item="item" :active="isActive(item)">
        <i v-if="item.icon" :class="[item.icon, 'SegmentedTabs-item-icon']"></i>
        <caption-string
          class="SegmentedTabs-item-label"
          :value="item.label"
          :title="item.label"
        ></caption-string>
      </slot>
    </button>
    <span v-if="hiddenItemsCount" class="SegmentedTabs-more" aria-hidden="true">
      +{{ hiddenItemsCount }}
    </span>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import CaptionString from './CaptionString.vue';

export type SegmentedTabVariant = 'accent' | 'raised';

type SegmentedTabItem = {
  key: string | number;
  label: string;
  icon?: string;
};

export default defineComponent({
  name: 'SegmentedTabs',
  components: {
    CaptionString,
  },
  props: {
    items: {
      type: Array as PropType<SegmentedTabItem[]>,
      required: true,
    },
    modelValue: {
      type: [String, Number, null],
      default: null,
    },
    variant: {
      type: String as PropType<SegmentedTabVariant>,
      default: 'accent',
    },
    maxItems: {
      type: Number,
      required: false,
      default: 0,
    },
    minItems: {
      type: Number,
      required: false,
      default: 1,
    },
  },
  emits: ['update:modelValue'],
  computed: {
    shown(): boolean {
      return this.items.length >= this.minItems;
    },
    visibleItems(): SegmentedTabItem[] {
      if (this.maxItems > 0) return this.items.slice(0, this.maxItems);
      return this.items;
    },
    hiddenItemsCount(): number {
      return Math.max(0, this.items.length - this.visibleItems.length);
    },
    hasVisibleActive(): boolean {
      return this.visibleItems.some((item) => this.isActive(item));
    },
  },
  methods: {
    isActive(item: SegmentedTabItem) {
      return item.key === this.modelValue;
    },
    isTabbable(item: SegmentedTabItem, index: number) {
      return this.hasVisibleActive ? this.isActive(item) : index === 0;
    },
    select(item: SegmentedTabItem) {
      if (this.isActive(item)) return;
      this.$emit('update:modelValue', item.key);
    },
    onKeydown(event: KeyboardEvent, index: number) {
      const lastIndex = this.visibleItems.length - 1;
      let nextIndex = -1;
      switch (event.key) {
        case 'ArrowRight':
          nextIndex = index >= lastIndex ? 0 : index + 1;
          break;
        case 'ArrowLeft':
          nextIndex = index <= 0 ? lastIndex : index - 1;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = lastIndex;
          break;
        default:
          return;
      }
      event.preventDefault();
      this.focusItem(event, nextIndex);
      this.select(this.visibleItems[nextIndex]);
    },
    focusItem(event: KeyboardEvent, index: number) {
      const items = (
        event.currentTarget as HTMLElement
      ).parentElement?.querySelectorAll<HTMLElement>('.SegmentedTabs-item');
      items?.[index]?.focus();
    },
  },
});
</script>

<style lang="scss" scoped>
.SegmentedTabs {
  --SegmentedTabs-radius: 12px;
  --SegmentedTabs-item-radius: 9px;
  --SegmentedTabs-item-padding: 6px 20px;
  --SegmentedTabs-item-max-width: none;
  --SegmentedTabs-item-idle-text-color: color-mix(
    in srgb,
    var(--local-text-color) 72%,
    transparent
  );
  --SegmentedTabs-item-active-bg: var(--panel-bg-color);
  --SegmentedTabs-item-active-shadow: 0 1px 2px rgba(0, 0, 0, 0.18),
    inset 0 0 0 1px color-mix(in srgb, var(--local-text-color) 8%, transparent);
  --SegmentedTabs-bg: var(--local-hl-bg-color);
  --SegmentedTabs-border-color: color-mix(
    in srgb,
    var(--local-border-color) 60%,
    transparent
  );

  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  padding: 4px;
  border-radius: var(--SegmentedTabs-radius);
  background: var(--SegmentedTabs-bg);
  box-shadow: inset 0 0 0 1px var(--SegmentedTabs-border-color);
  overflow-x: auto;
  overflow-y: hidden;
}
.SegmentedTabs-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 1 auto;
  max-width: var(--SegmentedTabs-item-max-width);
  white-space: nowrap;
  --button-padding: var(--SegmentedTabs-item-padding);
  --button-icon-gap: 6px;
  --button-border-width: 0px;
  --button-border-color: transparent;
  --button-border-radius: var(--SegmentedTabs-item-radius) !important;
  --button-bg-color: transparent;
  --button-text-color: var(--SegmentedTabs-item-idle-text-color);
  --button-font-size: 13px;
  --button-font-weight: 600;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0),
    inset 0 0 0 1px transparent;
  transition:
    background-color 0.18s,
    color 0.18s,
    box-shadow 0.18s;

  &:not(.state-active):hover {
    --button-bg-color: var(--button-bg-color-hover);
    --button-text-color: var(--local-text-color);
    --button-border-color: transparent;
  }

  &:focus,
  &:active {
    --button-border-color: transparent;
  }

  &:not(.state-active):focus,
  &:not(.state-active):active {
    --button-bg-color: var(--button-bg-color-hover);
    --button-text-color: var(--local-text-color);
  }

  &:focus:not(:focus-visible) {
    --button-outline-width: 0px;
  }

  &:focus-visible {
    outline-offset: 1px;
  }
}
.SegmentedTabs-variant-raised {
  --SegmentedTabs-item-idle-text-color: var(--local-sub-text-color);
}
.SegmentedTabs-variant-raised .SegmentedTabs-item {
  &.state-active {
    --button-bg-color: var(--SegmentedTabs-item-active-bg);
    --button-text-color: var(--local-text-color);
    box-shadow: var(--SegmentedTabs-item-active-shadow);

    .SegmentedTabs-item-icon {
      color: var(--color-accent);
    }
  }

  &.state-active:hover,
  &.state-active:focus,
  &.state-active:active {
    --button-bg-color: var(--SegmentedTabs-item-active-bg);
    --button-text-color: var(--local-text-color);
  }
}
.SegmentedTabs-more {
  flex: 0 0 auto;
  padding: 0 6px;
  font-size: 0.85em;
  font-weight: 600;
  line-height: var(--local-line-height-thin);
  color: var(--local-sub-text-color);
  white-space: nowrap;
  user-select: none;
}
.SegmentedTabs-item-icon {
  flex-shrink: 0;
  transition: color 0.18s;
}
.SegmentedTabs-item-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .SegmentedTabs-item,
  .SegmentedTabs-item-icon {
    transition: none;
  }
}
</style>

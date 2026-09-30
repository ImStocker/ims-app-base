<template>
  <div
    v-if="shown"
    class="ViewTabs use-buttons-options tiny-scrollbars"
    role="tablist"
  >
    <button
      v-for="view of visibleViews"
      :key="view.key"
      role="tab"
      class="is-button ViewTabs-tab"
      :class="{ 'state-current': view.key === currentView?.key }"
      :aria-selected="view.key === currentView?.key"
      @click="selectView(view)"
    >
      <i :class="[viewIcon(view), 'ViewTabs-tab-icon']"></i>
      <caption-string
        class="ViewTabs-tab-title"
        :value="view.title"
        :title="view.title"
      ></caption-string>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import CaptionString from '../../Common/CaptionString.vue';
import type { UserView } from './viewUtils';
import { VIEW_TYPES, MAX_VIEWS_TABS_COUNT } from './viewUtils';

export default defineComponent({
  name: 'ViewTabs',
  components: {
    CaptionString,
  },
  props: {
    views: {
      type: Array as PropType<UserView[]>,
      required: true,
    },
    currentView: {
      type: Object as PropType<UserView | null>,
      required: false,
      default: null,
    },
    maxTabsCount: {
      type: Number,
      required: false,
      default: MAX_VIEWS_TABS_COUNT,
    },
  },
  emits: ['selectView'],
  computed: {
    shown(): boolean {
      return this.views.length > 1;
    },
    visibleViews(): UserView[] {
      return this.views.slice(0, this.maxTabsCount);
    },
  },
  methods: {
    selectView(view: UserView) {
      if (view.key === this.currentView?.key) return;
      this.$emit('selectView', view.key);
    },
    viewIcon(view: UserView) {
      return (
        VIEW_TYPES.find((type) => type.type === view.type)?.icon ??
        VIEW_TYPES[0].icon
      );
    },
  },
});
</script>

<style lang="scss" scoped>
.ViewTabs {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 2px;

  .ViewTabs-tab {
    display: flex;
    align-items: center;
    gap: 5px;
    max-width: 150px;
    white-space: nowrap;
    --button-border-radius: 4px 4px 0 0;
    --button-border-color: transparent;
    box-shadow: inset 0 -2px 0 0 transparent;

    &.state-current {
      --button-bg-color: var(--app-menu-selected-bg-color);
      --button-text-color: var(--app-menu-selected-text-color);
      box-shadow: inset 0 -2px 0 0 var(--app-menu-selected-text-color);
    }
    &.state-current,
    & {
      &:focus,
      &:active {
        outline: none;
        --button-border-color: transparent;
      }
    }
  }
}
.ViewTabs-tab-icon {
  flex-shrink: 0;
}
.ViewTabs-tab-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: none;
}
</style>

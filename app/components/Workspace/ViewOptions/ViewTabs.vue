<template>
  <segmented-tabs
    :items="tabItems"
    :model-value="currentView?.key ?? null"
    :max-items="maxTabsCount"
    :min-items="2"
    variant="raised"
    class="ViewTabs"
    :style="{
      '--SegmentedTabs-item-padding': '6px 12px',
      '--SegmentedTabs-item-max-width': '150px',
      '--SegmentedTabs-bg': 'transparent',
      '--SegmentedTabs-border-color': 'transparent',
      '--SegmentedTabs-item-active-bg': 'transparent',
    }"
    @update:model-value="$emit('selectView', $event)"
  ></segmented-tabs>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import SegmentedTabs from '../../Common/SegmentedTabs.vue';
import type { UserView } from './viewUtils';
import { VIEW_TYPES, MAX_VIEWS_TABS_COUNT } from './viewUtils';

export default defineComponent({
  name: 'ViewTabs',
  components: {
    SegmentedTabs,
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
    tabItems() {
      return this.views.map((view) => ({
        key: view.key,
        label: view.title,
        icon:
          VIEW_TYPES.find((type) => type.type === view.type)?.icon ??
          VIEW_TYPES[0].icon,
      }));
    },
  },
});
</script>

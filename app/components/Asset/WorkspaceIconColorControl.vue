<template>
  <entity-icon-color-control
    class="WorkspaceIconColorControl"
    :icon-class="iconClass"
    :color-name="colorName"
    :can-change="canChange"
    :save="save"
    @update:icon-class="$emit('update:iconClass', $event)"
    @update:color-name="$emit('update:colorName', $event)"
  />
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import EntityIconColorControl from './EntityIconColorControl.vue';
import type { EntityAppearance } from '../../logic/types/EntityAppearance';

export default defineComponent({
  name: 'WorkspaceIconColorControl',
  components: {
    EntityIconColorControl,
  },
  props: {
    iconClass: { type: String, default: '' },
    colorName: {
      type: String as PropType<string | null>,
      default: null,
    },
    canChange: { type: Boolean, default: false },
    save: {
      type: [Function, null] as PropType<
        ((params: EntityAppearance) => Promise<void>) | null
      >,
      default: null,
    },
  },
  emits: ['update:iconClass', 'update:colorName'],
});
</script>

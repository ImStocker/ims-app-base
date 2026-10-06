<template>
  <entity-icon-color-control
    class="AssetIconColorControl"
    :icon-class="assetIconClass"
    :color-name="assetColorName"
    :can-change="canChange"
    :save="saveHandler"
    @update:icon-class="$emit('update:assetIconClass', $event)"
    @update:color-name="$emit('update:assetColorName', $event)"
  />
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import EntityIconColorControl from './EntityIconColorControl.vue';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import { BLOCK_NAME_META, BLOCK_TYPE_META } from '../../logic/constants';
import type { EntityAppearance } from '../../logic/types/EntityAppearance';

export default defineComponent({
  name: 'AssetIconColorControl',
  components: {
    EntityIconColorControl,
  },
  props: {
    assetIconClass: { type: String, default: '' },
    assetColorName: {
      type: String as PropType<string | null>,
      default: null,
    },
    canChange: { type: Boolean, default: false },
    applySave: { type: Boolean, default: false },
    assetId: { type: String, default: undefined },
  },
  emits: ['update:assetIconClass', 'update:assetColorName'],
  computed: {
    saveHandler(): ((params: EntityAppearance) => Promise<void>) | null {
      return this.applySave && this.assetId ? this.handleSave : null;
    },
  },
  methods: {
    async handleSave(params: EntityAppearance) {
      if (!this.applySave || !this.assetId) return;
      const manager = this.$getAppManager().get(CreatorAssetManager);
      if (params.icon !== undefined) {
        await manager.changeAssets({
          where: {
            id: [this.assetId],
          },
          set: {
            icon: params.icon,
          },
        });
      }
      if (params.color !== undefined) {
        await manager.changeAssets({
          where: {
            id: [this.assetId],
          },
          set: {
            blocks: {
              [BLOCK_NAME_META]: {
                name: BLOCK_NAME_META,
                type: BLOCK_TYPE_META,
                props: {
                  color: params.color,
                },
              },
            },
          },
        });
      }
    },
  },
});
</script>

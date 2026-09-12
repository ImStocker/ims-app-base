<template>
  <dialog-content class="SelectAssetColorDialog" @escape-press="choose()">
    <div class="Dialog-header">{{ $t('assetEditor.changeColor') }}</div>
    <div class="SelectAssetColorDialog-colors">
      <button
        v-for="color in colors"
        :key="color.name"
        class="SelectAssetColorDialog-color"
        :class="{ selected: color.name === dialog.state.value }"
        :style="{ backgroundColor: color.color }"
        :title="color.name"
        @click="choose(color.name)"
      ></button>
      <button
        class="SelectAssetColorDialog-color SelectAssetColorDialog-noColor"
        :class="{ selected: !dialog.state.value }"
        :title="$t('assetEditor.noColor')"
        @click="choose(null)"
      >
        <i class="ri-close-line"></i>
      </button>
    </div>
  </dialog-content>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../Dialog/DialogContent.vue';
import { ASSET_ICON_COLORS } from '../../logic/constants';
import type { DialogInterface } from '../../logic/managers/DialogManager';

type DialogProps = {
  assetId?: string;
  value: string | null;
};

type DialogResult = string | null | void;

export default defineComponent({
  name: 'SelectAssetColorDialog',
  components: {
    DialogContent,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  computed: {
    colors() {
      return ASSET_ICON_COLORS;
    },
  },
  methods: {
    choose(value?: string | null) {
      this.dialog.close(value);
    },
  },
});
</script>

<style lang="scss" scoped>
.SelectAssetColorDialog {
  padding: 20px;
  width: 400px;
  max-width: calc(100% - 20px);

  .Dialog-header {
    margin-bottom: 12px;
  }
}
.SelectAssetColorDialog-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.SelectAssetColorDialog-color {
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 2px solid var(--local-border-color);
  cursor: pointer;
  padding: 0;

  &.selected {
    border-color: var(--color-accent);
    box-shadow:
      0 0 0 2px var(--dropdown-bg-color),
      0 0 0 4px var(--color-accent);
  }

  &:hover {
    transform: scale(1.08);
  }
}
.SelectAssetColorDialog-noColor {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--local-bg-color);
  color: var(--local-sub-text-color);
  font-size: 16px;
}
</style>

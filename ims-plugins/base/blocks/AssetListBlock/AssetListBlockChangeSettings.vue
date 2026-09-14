<template>
  <div class="AssetListBlockChangeSettings">
    <div class="AssetListBlockChangeSettings-close" @click="$emit('save')">
      <i class="ri-close-line"></i>
    </div>
    <div class="AssetListBlockChangeSettings-header">
      <div class="AssetListBlockChangeSettings-header-title">
        <caption-string :value="title" />
      </div>
      <div class="AssetListBlockChangeSettings-header-key" :title="key">
        <i
          class="ri-list-check-3 AssetListBlockChangeSettings-header-key-icon"
        ></i>
        <caption-string :value="key" />
      </div>
    </div>
    <div class="AssetListBlockChangeSettings-section">
      <div class="AssetListBlockChangeSettings-section-header">
        {{ $t('assetEditor.assetListBlockType') }}
      </div>
      <div class="AssetListBlockChangeSettings-section-content">
        <gdd-element-selector-prop-editor
          :model-value="type"
          :nullable="true"
          @update:model-value="setFieldParam('__type', $event)"
        ></gdd-element-selector-prop-editor>
      </div>
    </div>
    <div class="AssetListBlockChangeSettings-section">
      <div class="AssetListBlockChangeSettings-section-header">
        {{ $t('assetEditor.assetListBlockCondition') }}
      </div>
      <div class="AssetListBlockChangeSettings-section-content">
        <selection-prop-editor
          :model-value="condition"
          @update:model-value="setFieldParam('__condition', $event)"
        ></selection-prop-editor>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import { type AssetPropValue, makeBlockRef } from '#logic/types/Props';
import CaptionString from '#components/Common/CaptionString.vue';
import GddElementSelectorPropEditor from '#components/Props/GddElementSelectorPropEditor.vue';
import SelectionPropEditor from '#components/Props/SelectionProp/SelectionPropEditor.vue';
import type { AssetChanger } from '#logic/types/AssetChanger';
import type { ResolvedAssetBlock } from '#logic/utils/assets';

export default defineComponent({
  name: 'AssetListBlockChangeSettings',
  components: {
    CaptionString,
    GddElementSelectorPropEditor,
    SelectionPropEditor,
  },
  props: {
    assetChanger: {
      type: Object as PropType<AssetChanger>,
      required: true,
    },
    resolvedBlock: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
  },
  emits: ['save'],
  computed: {
    title(): string {
      return (
        this.resolvedBlock.title ?? this.resolvedBlock.name ?? 'Asset list'
      );
    },
    key(): string {
      return this.resolvedBlock.name ?? this.resolvedBlock.title ?? '';
    },
    type(): AssetPropValue | null {
      return (
        (this.resolvedBlock.computed?.['__type'] as AssetPropValue) ?? null
      );
    },
    condition(): AssetPropValue | null {
      return (
        (this.resolvedBlock.computed?.['__condition'] as AssetPropValue) ?? null
      );
    },
  },
  methods: {
    setFieldParam(param: string, value: AssetPropValue) {
      this.assetChanger.setBlockPropKey(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        param,
        value,
      );
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins.scss';

$padding-top: 85px;
$padding-aside: 20px;

.AssetListBlockChangeSettings {
  position: relative;

  @include devices-mixins.device-type(not-pc) {
    width: 100% !important;
    padding: $padding-top $padding-aside $padding-aside !important;
  }
}

.AssetListBlockChangeSettings-header {
  font-weight: bold;
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.AssetListBlockChangeSettings-header-title {
  flex: 1;
  display: flex;
  margin-left: 5px;
}

.AssetListBlockChangeSettings-header-key {
  color: var(--local-sub-text-color);
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.AssetListBlockChangeSettings-header-key-icon {
  margin-right: 3px;
}

.AssetListBlockChangeSettings-section {
  margin-bottom: 20px;
}

.AssetListBlockChangeSettings-section-header {
  margin-bottom: 10px;
}

.AssetListBlockChangeSettings-close {
  position: absolute;
  right: $padding-aside;
  top: $padding-top - 40px;
  font-size: 25px;

  @include devices-mixins.device-type(pc) {
    display: none;
  }
}
</style>

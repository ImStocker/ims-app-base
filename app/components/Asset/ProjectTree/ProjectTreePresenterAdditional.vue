<template>
  <div class="ProjectTreePresenterAdditional">
    <div
      v-if="additionalOption"
      class="ProjectTreePresenter-row type-additional"
    >
      <div
        v-if="$slots.additionalPrepend && additionalOption"
        class="ProjectTreePresenter-prepend"
      >
        <slot name="additionalPrepend" :additional="additionalOption"></slot>
      </div>
      <caption-string
        class="ProjectTreePresenterAdditional-caption"
        :class="iconClass"
        :value="additionalOption.title ?? ''"
        :title="additionalOption.title ?? ''"
      ></caption-string>
      <div
        v-if="$slots.additionalAppend && additionalOption"
        class="ProjectTreePresenter-append"
      >
        <slot name="additionalAppend" :additional="additionalOption"></slot>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { ProjectTreeItemPayload } from './ProjectTreePresenterBaseVM';
import type { TreePresenterItem } from '../../Common/TreePresenter/TreePresenter';
import type { AssetForSelection } from '../../../logic/types/AssetsType';
import CaptionString from '../../Common/CaptionString.vue';

export default defineComponent({
  name: 'ProjectTreePresenterAdditional',
  components: {
    CaptionString,
  },
  props: {
    item: {
      type: Object as PropType<TreePresenterItem<ProjectTreeItemPayload>>,
      required: true,
    },
    additionalOptions: {
      type: Array<AssetForSelection>,
      default: () => [],
    },
  },
  computed: {
    additionalOption() {
      return this.additionalOptions.find(
        (ao) => ao.id === this.item.payload.id,
      );
    },
    iconClass() {
      if (!this.additionalOption || !this.additionalOption.icon) {
        return null;
      }
      return 'asset-icon-' + this.additionalOption.icon;
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/asset-icons';
.ProjectTreePresenterAdditional-caption {
  @include asset-icons.asset-icons;
  &:before {
    margin-right: 2px;
    position: relative;
    font-size: 14px;
    display: inline-block;
  }
}
</style>

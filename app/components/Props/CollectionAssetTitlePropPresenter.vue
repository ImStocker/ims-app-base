<template>
  <div class="CollectionAssetTitlePropPresenter">
    <asset-link
      class="CollectionAssetTitlePropPresenter-link"
      :project="projectContextComp.projectInfo"
      :asset="assetLink"
      :open-popup="true"
      ><caption-string :value="assetLink.title"></caption-string
    ></asset-link>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import {
  castAssetPropValueToString,
  type AssetPropValue,
} from '../../logic/types/Props';
import type { PropsFormState } from '../../logic/types/PropsForm';
import type { IProjectContext } from '../../logic/types/IProjectContext';
import { assert } from '../../logic/utils/typeUtils';
import AssetLink from '../Asset/AssetLink.vue';
import CaptionString from '../Common/CaptionString.vue';

export default defineComponent({
  name: 'CollectionAssetTitlePropPresenter',
  components: {
    AssetLink,
    CaptionString,
  },
  inject: ['projectContext'],
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    formState: {
      type: Object as PropType<PropsFormState>,
      required: true,
    },
  },
  emits: ['update:modelValue', 'blur', 'preEnter', 'enter', 'changeProps'],
  computed: {
    projectContextComp() {
      assert(this.projectContext, 'projectContext is not provided');
      return this.projectContext as IProjectContext;
    },
    assetId() {
      return castAssetPropValueToString(this.formState.combined.id);
    },
    assetLink() {
      return {
        id: this.assetId,
        icon: this.formState.combined.icon
          ? castAssetPropValueToString(this.formState.combined.icon)
          : undefined,
        title: this.formState.combined.title
          ? castAssetPropValueToString(this.formState.combined.title)
          : undefined,
        name: null,
      };
    },
  },
  methods: {},
});
</script>

<style lang="scss" scoped>
@use '$style/asset-icons';
.CollectionAssetTitlePropPresenter {
  padding: 5px;
}
.CollectionAssetTitlePropPresenter-link {
  display: inline-flex;
  text-decoration: none;
}
</style>

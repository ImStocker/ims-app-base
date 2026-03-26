<template>
  <fully-filled-content-layout>
    <div class="FullyFilledPage">
      <bread-crumbs
        v-if="projectInfo && breadCrumbs && breadCrumbs.length"
        class="FullyFilledPage-breadcrumbs"
        :project-info="projectInfo"
        :bread-crumbs="breadCrumbs"
      ></bread-crumbs>
      <div class="FullyFilledPage-header">
        <slot name="header"></slot>
      </div>
      <div class="FullyFilledPage-content">
        <slot></slot>
      </div>
    </div>
  </fully-filled-content-layout>
</template>
<script lang="ts">
import { defineComponent, inject, type PropType } from 'vue';
import FullyFilledContentLayout from './FullyFilledContentLayout.vue';
import BreadCrumbs from '../BreadCrumbs.vue';
import type { BreadCrumbsEntity } from '../../logic/types/BreadCrumbs';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';

export default defineComponent({
  name: 'FullyFilledPage',
  components: {
    FullyFilledContentLayout,
    BreadCrumbs,
  },
  props: {
    breadCrumbs: {
      type: Array as PropType<BreadCrumbsEntity[]>,
      default: null,
    },
  },
  setup() {
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    return {
      projectContext,
    };
  },
  computed: {
    projectInfo() {
      return this.projectContext.projectInfo;
    },
  },
});
</script>
<style lang="scss" scoped>
@use '$style/devices-mixins.scss';

.FullyFilledPage {
  padding: 38px 25px 0px;
  height: 100%;
  display: flex;
  flex-direction: column;

  @include devices-mixins.device-type(not-pc) {
    padding: 78px 12px 0px;
  }
}

.FullyFilledPage-header {
  display: flex;
}

.FullyFilledPage-content {
  flex: 1;
  min-height: 0;
}
</style>

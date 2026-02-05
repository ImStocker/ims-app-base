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
import { defineComponent, type PropType } from 'vue';
import FullyFilledContentLayout from './FullyFilledContentLayout.vue';
import BreadCrumbs from '../BreadCrumbs.vue';
import type { BreadCrumbsEntity } from '../../logic/types/BreadCrumbs';
import ProjectManager from '../../logic/managers/ProjectManager';

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
  computed: {
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
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

<template>
  <centered-content-layout
    class="CenteredPage"
    :right-side-width="rightSideWidth"
    :menu-width="menuWidth as number"
  >
    <template #content-left-column>
      <slot name="content-left-column"></slot>
    </template>
    <template #content-right-column>
      <slot name="content-right-column"></slot>
    </template>
    <div class="CenteredPage-inner">
      <bread-crumbs
        v-if="projectInfo && breadCrumbs && breadCrumbs.length"
        class="CenteredPage-breadcrumbs"
        :project-info="projectInfo"
        :bread-crumbs="breadCrumbs"
      ></bread-crumbs>
      <div class="CenteredPage-header">
        <slot name="header"></slot>
      </div>
      <div class="CenteredPage-content">
        <slot></slot>
      </div>
    </div>
    <template #right>
      <div class="CenteredPage-right">
        <slot name="right"></slot>
      </div>
    </template>
  </centered-content-layout>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import CenteredContentLayout from './CenteredContentLayout.vue';
import BreadCrumbs from '../BreadCrumbs.vue';
import type { BreadCrumbsEntity } from '../../logic/types/BreadCrumbs';
import ProjectManager from '../../logic/managers/ProjectManager';

export default defineComponent({
  name: 'CenteredPage',
  components: {
    CenteredContentLayout,
    BreadCrumbs,
  },
  inject: ['providedMenuWidth'],
  props: {
    breadCrumbs: {
      type: Array as PropType<BreadCrumbsEntity[]>,
      default: null,
    },
  },
  computed: {
    menuWidth() {
      return this.providedMenuWidth;
    },
    rightSideWidth() {
      return 200;
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
  },
});
</script>
<style lang="scss" scoped>
@use '$style/devices-mixins.scss';

$padding-top: 38px;

.CenteredPage-inner {
  padding-top: $padding-top;
  display: flex;
  flex-direction: column;

  @include devices-mixins.device-type(not-pc) {
    $padding-top: 70px;
    padding-top: $padding-top;
    width: 100%;
  }
}

.CenteredPage-header {
  display: flex;
}

.CenteredPage-content {
  flex: 1;
}

.CenteredPage-right {
  padding-top: $padding-top;
}
</style>

<template>
  <div class="CollectionBlockManagePanel use-buttons-options">
    <div class="CollectionBlockManagePanel-left">
      <select-view-button
        :vm="vm"
        @select-view="$emit('selectView', $event)"
      ></select-view-button>
    </div>
    <div v-if="vm.currentView" class="CollectionBlockManagePanel-right">
      <component
        :is="option.component"
        v-for="option of viewOptions"
        :key="option.name"
        :vm="vm"
        :model-value="vm.modifiedCurrentView[option.name]"
        :prop-name="option.name"
        :columns="columns"
        :saved="!vm.isChangedCurrentView(option.name)"
        @change:view-props="vm.changeCurrentView(option.name, $event)"
        @save:view-props="saveView()"
      ></component>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type Component, type PropType } from 'vue';
import SelectViewButton from './ViewOptions/SelectViewButton.vue';
import ViewOptionButton from './ViewOptions/ViewOptionButton.vue';
import ViewPropertiesButton from './ViewOptions/ViewPropertiesButton.vue';
import type { UserView } from './ViewOptions/viewUtils';
import UiManager from '../../logic/managers/UiManager';
import type { ICollectionBlockController } from '~ims-plugin-base/blocks/CollectionBlock/CollectionBlockController';
import ViewFilterButton from './ViewOptions/ViewFilterButton.vue';
import type { WorkspaceCollectionColumn } from '../GameDesign/WorkspaceCollectionContent';

type ViewOptionType = {
  name: keyof UserView;
  component: Component;
};

export default defineComponent({
  name: 'CollectionBlockManagePanel',
  components: {
    SelectViewButton,
    ViewOptionButton,
    ViewFilterButton,
    ViewPropertiesButton,
  },
  props: {
    vm: {
      type: Object as PropType<ICollectionBlockController>,
      required: true,
    },
    columns: {
      type: Array<WorkspaceCollectionColumn>,
      required: true,
    },
  },
  emits: ['selectView'],
  computed: {
    viewOptions(): ViewOptionType[] {
      return [
        {
          name: 'sort',
          component: ViewOptionButton,
        },
        {
          name: 'filter',
          component: ViewFilterButton,
        },
        {
          name: 'props',
          component: ViewPropertiesButton,
        },
      ];
    },
  },
  methods: {
    saveView() {
      this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.vm.saveCurrentView();
        });
    },
  },
});
</script>

<style lang="scss" scoped>
.CollectionBlockManagePanel {
  display: flex;
  justify-content: space-between;
  padding-bottom: 10px;
  flex-wrap: wrap;
  gap: 5px;
}
.CollectionBlockManagePanel-right {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
</style>

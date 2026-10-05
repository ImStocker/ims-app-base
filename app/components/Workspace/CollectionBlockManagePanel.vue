<template>
  <div class="CollectionBlockManagePanel use-buttons-options">
    <div class="CollectionBlockManagePanel-left">
      <select-view-button
        :vm="vm"
        @select-view="$emit('selectView', $event)"
      ></select-view-button>
      <view-tabs
        class="CollectionBlockManagePanel-tabs"
        :views="vm.workspaceViews"
        :current-view="vm.currentView"
        @select-view="$emit('selectView', $event)"
      ></view-tabs>
    </div>
    <div v-if="vm.currentView" class="CollectionBlockManagePanel-right">
      <save-view-button
        v-if="userRole && isCurrentViewChanged()"
        @save="saveView()"
      ></save-view-button>
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
import SaveViewButton from './ViewOptions/SaveViewButton.vue';
import ViewOptionButton from './ViewOptions/ViewOptionButton.vue';
import ViewPropertiesButton from './ViewOptions/ViewPropertiesButton.vue';
import ViewTabs from './ViewOptions/ViewTabs.vue';
import type { UserView } from './ViewOptions/viewUtils';
import UiManager from '../../logic/managers/UiManager';
import ProjectManager from '../../logic/managers/ProjectManager';
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
    SaveViewButton,
    ViewOptionButton,
    ViewFilterButton,
    ViewPropertiesButton,
    ViewTabs,
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
    // Тот же гейт, что и у кнопки сохранения внутри дропдаунов: сохранять вид
    // может не каждый участник проекта.
    userRole() {
      return this.$getAppManager().get(ProjectManager).getUserRoleInProject();
    },
    // Есть ли что сохранять. `isChangedCurrentView` сравнивает конкретное
    // свойство с сохранённым, поэтому берём «хоть одно из» по списку опций —
    // он же перечисляет всё, что вид умеет менять.
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
    // Именно метод, а не computed: `vm` — обычный экземпляр контроллера,
    // переданный пропом, а `_unsavedViewData` мутируется на месте. Computed
    // собрал бы зависимостей ровно одну (сам проп) и навсегда закешировал бы
    // первое значение, тогда как существующие точки «есть несохранённые
    // изменения» работают именно тем, что это выражения в шаблоне — они
    // пересчитываются на каждом рендере. Здесь нужен тот же механизм.
    isCurrentViewChanged(): boolean {
      return this.viewOptions.some((option) =>
        this.vm.isChangedCurrentView(option.name),
      );
    },
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
.CollectionBlockManagePanel-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-wrap: wrap;
}
.CollectionBlockManagePanel-left > .SelectViewButton {
  flex: 0 0 auto;
  width: auto;
}
.CollectionBlockManagePanel-tabs {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
}
.CollectionBlockManagePanel-right {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
</style>

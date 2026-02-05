<template>
  <menu-button
    v-model:shown="dropdownShown"
    class="SelectViewButton"
    @show="dropdownShownHandler()"
  >
    <template #button="{ toggle }">
      <button
        ref="button"
        class="is-button SelectViewButton-button"
        :class="{ focus: dropdownShown }"
        @click="toggle()"
      >
        <div class="SelectViewButton-label">
          <i
            v-if="selectedViewIcon"
            :class="[selectedViewIcon]"
            class="SelectViewButton-label-icon"
          ></i>
          <caption-string
            class="SelectViewButton-parentTitle"
            :value="currentView?.title ?? '[[t:Table]]'"
          >
          </caption-string>
          <i class="ri-expand-up-down-line"></i>
        </div>
      </button>
    </template>
    <select-view-box
      ref="selectViewBox"
      :model-value="currentView"
      :user-views="workspaceViews"
      :vm="vm"
      :search-text="searchText"
      class="is-dropdown SelectViewButton-dropdown"
      @update:model-value="onSelected($event)"
      @update:view="openViewSettingsDialog($event)"
      @update:list="changeList($event)"
      @update:search-text="searchText = $event"
    >
      <template v-if="userRole" #append>
        <button
          class="is-button is-button-dropdown-item SelectViewButton-create-new-button"
          @click="openViewSettingsDialog()"
        >
          <i class="ri-add-line"></i>
          {{ $t('viewSettings.createView') }}
        </button>
      </template>
    </select-view-box>
  </menu-button>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { ICollectionBlockController } from '~ims-plugin-base/blocks/CollectionBlock/CollectionBlockController';
import DialogManager from '../../../logic/managers/DialogManager';
import ProjectManager from '../../../logic/managers/ProjectManager';
import UiManager from '../../../logic/managers/UiManager';
import { normalizeAssetPropPart } from '../../../logic/types/Props';
import { getNextIndexWithTimestamp } from '../../Asset/Editor/blockUtils';
import type { UserView } from './viewUtils';
import { VIEW_TYPES, VIEW_TYPES_MAP } from './viewUtils';
import CaptionString from '../../Common/CaptionString.vue';
import MenuButton from '../../Common/MenuButton.vue';
import SelectViewBox from './SelectViewBox.vue';
import ViewSettingsDialog from './ViewSettingsDialog.vue';

export default defineComponent({
  name: 'SelectViewButton',
  components: {
    CaptionString,
    MenuButton,
    SelectViewBox,
  },
  props: {
    vm: {
      type: Object as PropType<ICollectionBlockController>,
      required: true,
    },
  },
  emits: ['selectView'],
  data() {
    return {
      dropdownShown: false,
      searchText: '',
    };
  },
  computed: {
    currentView() {
      return this.vm.currentView;
    },
    selectedViewIcon() {
      return (
        VIEW_TYPES.find((view) => view.type === this.currentView?.type)?.icon ??
        VIEW_TYPES[0].icon
      );
    },
    workspaceViews() {
      const search_text = this.searchText
        ? this.searchText.toLocaleLowerCase()
        : '';
      return search_text.length > 0
        ? this.vm.workspaceViews.filter((view) =>
            view.title.toLocaleLowerCase().includes(search_text),
          )
        : this.vm.workspaceViews;
    },
    userRole() {
      return this.$getAppManager().get(ProjectManager).getUserRoleInProject();
    },
  },
  methods: {
    async changeList(user_views: UserView[]) {
      if (this.vm.workspaceId) {
        const user_views_map = {};
        let index = 0;
        for (const user_view of user_views) {
          user_views_map[user_view.key] = {
            ...user_view,
            index: index++,
          };
        }
        await this.vm.saveWorkspaceViews(user_views_map);
      }
    },
    onSelected(key: string) {
      this.$emit('selectView', key);
      this.dropdownShown = false;
    },
    async dropdownShownHandler() {
      await new Promise((res) => setTimeout(res, 10));
      this.focusInSearch();
    },
    focusInSearch() {
      if (!this.$refs.selectViewBox) return;
      (
        this.$refs.selectViewBox as InstanceType<typeof SelectViewBox>
      ).focusInSearch();
    },
    async openViewSettingsDialog(view?: UserView) {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          const views_map = Object.fromEntries(
            this.vm.workspaceViews.map((wv) => [wv.key, wv]),
          );
          let new_view_key: string;

          if (view) {
            const changed_user_view = await this.$getAppManager()
              .get(DialogManager)
              .show(ViewSettingsDialog, {
                header: this.$t('viewSettings.changeView'),
                buttonTitle: this.$t('viewSettings.saveView'),
                view,
                allViews: this.vm.workspaceViews,
              });
            if (!changed_user_view) return;
            new_view_key = normalizeAssetPropPart(changed_user_view.title);
            delete views_map[view.key];
            if (!changed_user_view.needDelete) {
              views_map[new_view_key] = {
                ...view,
                title: changed_user_view.title,
                type: changed_user_view.type,
              };
            }
          } else {
            const new_view = await this.$getAppManager()
              .get(DialogManager)
              .show(ViewSettingsDialog, {
                header: this.$t('viewSettings.createView'),
                buttonTitle: this.$t('viewSettings.saveView'),
                allViews: this.vm.workspaceViews,
              });
            if (!new_view) return;
            new_view_key = normalizeAssetPropPart(new_view.title);
            const max_index =
              this.vm.workspaceViews.length > 0
                ? this.vm.workspaceViews[this.vm.workspaceViews.length - 1]
                    .index
                : 0;
            views_map[new_view_key] = {
              ...new_view,
              index: getNextIndexWithTimestamp(max_index),
              key: new_view_key,
              sort: [],
              filter: [],
              props: [],
              ...VIEW_TYPES_MAP[new_view.type].default(),
            };
            this.currentView = { ...views_map[new_view_key] };
          }
          await this.vm.saveWorkspaceViews(views_map);
          this.$emit('selectView', new_view_key);
        });
    },
  },
});
</script>

<style lang="scss" scoped>
.SelectViewButton {
  width: 100%;
  min-width: 100px;
}

.SelectViewButton-menu-button {
  display: flex;
  width: 100%;
}

.SelectViewButton-menu-label {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 23px;
  gap: 5px;
  min-width: 0;
}

.SelectViewButton-menu-label-disabled {
  width: fit-content;
  max-width: 100%;
  margin-left: auto;
  display: flex;
  gap: 5px;
}

.SelectViewButton-menu-parentTitle {
  text-transform: none;
  overflow: hidden;
  text-overflow: ellipsis;
}

.SelectViewButton-menu-icon {
  transition: transform 0.2s;

  &.state-open {
    transform: rotate(180deg);
  }
}

.SelectViewButton-dropdown {
  padding: var(--dropdown-padding);
  min-width: var(--DropdownContainer-attachToElement-width);
  --SelectWorkspaceListBox-itemsHeight: 250px;
}

.SelectViewButton-create-new-button {
  display: flex;
  gap: 5px;
  --button-padding: 5px 10px !important;
  --button-border-radius: 4px !important;
}
.SelectViewButton-label-icon {
  margin-right: 5px;
}
</style>

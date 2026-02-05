<template>
  <div class="SelectViewBox">
    <FormSearch
      ref="search"
      class="SelectViewBox-search"
      :value="searchTextOwn"
      :autofocus="true"
      @change="searchTextOwn = $event"
    ></FormSearch>
    <div class="SelectViewBox-allOptions">
      <div
        v-if="!searchLoaded"
        class="loaderSpinner SelectViewBox-loader"
      ></div>
      <div v-if="!listEmpty" class="SelectViewBox-items tiny-scrollbars">
        <sortable-list
          class="SelectViewBox-items-list"
          :list="userViews"
          :id-key="(item) => item.key"
          handle-selector=".SelectViewBox-items-list-item-drag"
          :disabled="!userRole"
          @update:list="changeList($event)"
        >
          <template #default="{ item }">
            <div class="SelectViewBox-items-list-item">
              <div v-if="userRole" class="SelectViewBox-items-list-item-drag">
                <i class="ri-draggable"></i>
              </div>
              <i :class="[selectedViewIcon(item), 'SelectViewBox-icon']"></i>
              <caption-string
                class="SelectViewBox-title"
                :value="item.title"
                @click="onSelected(item.key)"
              ></caption-string>
              <div v-if="userRole" class="SelectViewBox-items-list-item-manage">
                <button
                  class="is-button is-button-icon-outlined SelectViewBox-items-list-item-manage-edit"
                  @click="openViewSettingsDialog(item)"
                >
                  <i class="ri-pencil-fill"></i>
                </button>
              </div>
            </div>
          </template>
        </sortable-list>
      </div>
      <div
        v-if="$slots.append"
        class="SelectViewBox-additionalOptions"
        :class="{ 'SelectViewBox-without-items': listEmpty }"
      >
        <slot name="append"></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import FormSearch from '../../Form/FormSearch.vue';
import SortableList from '../../Common/SortableList.vue';
import CaptionString from '../../Common/CaptionString.vue';
import type { ICollectionBlockController } from '~ims-plugin-base/blocks/CollectionBlock/CollectionBlockController';
import ProjectManager from '../../../logic/managers/ProjectManager';
import type { AssetForSelection } from '../../../logic/types/AssetsType';
import type { UserView } from './viewUtils';
import { VIEW_TYPES } from './viewUtils';

export default defineComponent({
  name: 'SelectViewBox',
  components: {
    SortableList,
    FormSearch,
    CaptionString,
  },
  props: {
    modelValue: {
      type: Object as PropType<UserView | null>,
      required: false,
      default: null,
    },
    searchText: {
      type: String,
      default: '',
    },
    additionalOptions: {
      type: Array<AssetForSelection>,
      default: () => [],
    },
    vm: {
      type: Object as PropType<ICollectionBlockController>,
      required: true,
    },
    userViews: {
      type: Array<UserView>,
      required: true,
    },
  },
  emits: [
    'update:modelValue',
    'update:searchText',
    'update:list',
    'update:view',
  ],
  data() {
    return {
      searchTextOwn: this.searchText,
      searchLoaded: true,
    };
  },
  computed: {
    userRole() {
      return this.$getAppManager().get(ProjectManager).getUserRoleInProject();
    },
    listEmpty() {
      return this.userViews.length === 0;
    },
  },
  watch: {
    searchText() {
      if (this.searchTextOwn !== this.searchText) {
        this.searchTextOwn = this.searchText;
      }
    },
    searchTextOwn() {
      if (this.searchTextOwn !== this.searchText) {
        this.$emit('update:searchText', this.searchTextOwn);
      }
    },
  },
  methods: {
    onSelected(key: string) {
      this.$emit('update:modelValue', key);
    },
    selectedViewIcon(view: UserView) {
      return (
        VIEW_TYPES.find((v) => v.type === view.type)?.icon ?? VIEW_TYPES[0].icon
      );
    },
    focusInSearch() {
      if (!this.$refs.search) return;
      (this.$refs.search as InstanceType<typeof FormSearch>).focus();
    },
    changeList(user_views: UserView[]) {
      this.$emit('update:list', user_views);
    },
    async openViewSettingsDialog(user_view: UserView) {
      this.$emit('update:view', user_view);
    },
  },
});
</script>

<style lang="scss">
.SelectViewBox {
  padding: 5px !important;
}

.SelectViewBox-search {
  margin-bottom: 12px;
}

.SelectViewBox-items {
  display: flex;
  gap: 8px;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}
.SelectViewBox-allOptions {
  display: flex;
  flex-direction: column;
}

.SelectViewBox-without-items {
  border-top: none;
}

.SelectViewBox-additionalOptions {
  border: none;
  border-top: 1px solid var(--local-text-color);
  padding-top: 5px;
  margin-top: 10px;
}

.SelectViewBox-additionalOptions-item {
  display: flex;
  gap: 5px;
  --button-padding: 5px 10px !important;
  --button-border-radius: 4px !important;
}

.SelectViewBox-items-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.SelectViewBox-items-list-item {
  display: flex;
  align-items: center;
  cursor: pointer;

  .SelectViewBox-items-list-item-drag {
    flex-shrink: 0;
    font-size: 15px;
    color: var(--local-sub-text-color);
    cursor: grab;

    &.hidden {
      opacity: 0;
      visibility: 0;
      cursor: default;
    }
  }

  .SelectViewBox-items-list-item-field {
    flex: 1;
    overflow: hidden;
    width: 100%;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .SelectViewBox-items-list-item-manage {
    display: flex;
    flex-shrink: 0;
  }
}
.SelectViewBox-items-list-item:hover {
  background-color: var(--app-menu-hl-bg-color);
}
.SelectViewBox-icon {
  margin-right: 5px;
}
.SelectViewBox-title {
  flex: 1;
}
.SelectViewBox-without-items {
  border-top: none;
}
</style>

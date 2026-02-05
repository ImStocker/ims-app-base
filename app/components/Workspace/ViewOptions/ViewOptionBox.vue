<template>
  <div class="ViewOptionBox">
    <div class="ViewOptionBox-allOptions">
      <div v-if="items.length > 0" class="ViewOptionBox-items tiny-scrollbars">
        <sortable-list
          class="ViewOptionBox-items-list"
          :list="items"
          :id-key="(item) => item.prop"
          handle-selector=".ViewOptionBox-items-list-item-drag"
          @update:list="changeList($event)"
        >
          <template #default="{ item, index }">
            <div class="ViewOptionBox-items-list-item">
              <div class="ViewOptionBox-items-list-item-drag">
                <i class="ri-draggable"></i>
              </div>
              <ims-select
                :model-value="item.prop"
                class="ViewOptionBox-items-list-item-select-property"
                :options="columns"
                :get-option-label="(opt: any) => opt.propTitle"
                :get-option-key="(opt: any) => opt.propKey"
                :reduce="(opt: any) => opt.propKey"
                :placeholder="$t('viewSettings.property')"
                @update:model-value="changeItem(index, $event, 'prop')"
              >
                <template #option-content="{ option }">
                  <caption-string :value="option.propTitle"></caption-string>
                </template>
              </ims-select>
              <template v-if="propName === 'sort'">
                <ims-select
                  :model-value="item.desc"
                  class="ViewOptionBox-items-list-item-select"
                  :options="sortOptions"
                  :get-option-label="(opt: any) => opt.title"
                  :get-option-key="(opt: any) => opt.value"
                  :reduce="(opt: any) => opt.value"
                  :clearable="false"
                  @update:model-value="changeItem(index, $event, 'desc')"
                >
                </ims-select>
              </template>
              <template v-else-if="propName === 'filter'">
                <ims-input
                  :model-value="item.value"
                  :disabled="!item.prop"
                  type="text"
                  class="ViewOptionBox-items-list-item-input"
                  @update:model-value="changeItem(index, $event, 'value')"
                ></ims-input>
              </template>
              <div class="ViewOptionBox-items-list-item-manage">
                <button
                  class="is-button is-button-icon-outlined ViewOptionBox-items-list-item-manage-edit"
                  @click.stop="deleteItem(item.prop)"
                >
                  <i class="ri-delete-bin-fill"></i>
                </button>
              </div>
            </div>
          </template>
        </sortable-list>
      </div>
      <div
        class="ViewOptionBox-additionalOptions"
        :class="{ 'ViewOptionButton-without-items': items.length === 0 }"
      >
        <button
          class="is-button is-button-dropdown-item ViewOptionButton-additional-button"
          @click="addItem()"
        >
          <i class="ri-add-line"></i>
          {{
            $t(
              'viewSettings.' + (propName === 'sort' ? 'addSort' : 'addFilter'),
            )
          }}
        </button>
        <slot name="append"></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import SortableList from '../../Common/SortableList.vue';
import ImsSelect from '../../Common/ImsSelect.vue';
import ImsInput from '../../Common/ImsInput.vue';
import CaptionString from '../../Common/CaptionString.vue';
import type { WorkspaceCollectionColumn } from '../../GameDesign/WorkspaceCollectionContent';
import type { UserViewSort, UserViewFilter } from './viewUtils';

export default defineComponent({
  name: 'ViewOptionBox',
  components: {
    SortableList,
    ImsSelect,
    ImsInput,
    CaptionString,
  },
  props: {
    modelValue: {
      type: Array<UserViewSort | UserViewFilter>,
      required: false,
      default: () => [],
    },
    columns: {
      type: Array<WorkspaceCollectionColumn>,
      required: true,
    },
    propName: {
      type: String,
      required: true,
    },
  },
  emits: ['update:list'],
  data() {
    return {
      items: [...this.modelValue],
    };
  },
  computed: {
    sortOptions() {
      return [
        {
          title: this.$t('viewSettings.sortOptions.asc'),
          value: false,
        },
        {
          title: this.$t('viewSettings.sortOptions.desc'),
          value: true,
        },
      ];
    },
  },
  methods: {
    changeItem(index: number, value: boolean, prop_name: string) {
      this.items[index][prop_name] = value;
      this.$emit('update:list', this.items);
    },
    changeList(view_options: UserViewSort[]) {
      this.$emit('update:list', view_options);
    },
    addItem() {
      this.items.push({
        prop: this.columns[0].propKey ?? '',
        ...(this.propName === 'sort' ? { desc: false } : { value: '' }),
      });
      this.$emit('update:list', this.items);
    },
    deleteItem(prop_key: string) {
      const index = this.items.findIndex((item) => item.prop === prop_key);
      if (index > -1) {
        this.items.splice(index, 1);
        this.$emit('update:list', this.items);
      }
    },
  },
});
</script>

<style lang="scss">
.ViewOptionBox {
  padding: 5px;
}

.ViewOptionBox-search {
  margin-bottom: 12px;
}

.ViewOptionBox-items {
  display: flex;
  gap: 8px;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}
.ViewOptionBox-allOptions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ViewOptionBox-additionalOptions {
  border: none;
  border-top: 1px solid var(--local-text-color);
  padding-top: 5px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.ViewOptionBox-additionalOptions-item {
  display: flex;
  gap: 5px;
  --button-padding: 5px 10px !important;
  --button-border-radius: 4px !important;
}

.ViewOptionBox-items-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ViewOptionBox-items-list-item {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 5px;

  .ViewOptionBox-items-list-item-drag {
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

  .ViewOptionBox-items-list-item-field {
    flex: 1;
    overflow: hidden;
    width: 100%;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .ViewOptionBox-items-list-item-manage {
    display: flex;
    flex-shrink: 0;
  }
}
.ViewOptionBox-items-list-item:hover {
  background-color: var(--app-menu-hl-bg-color);
}
.ViewOptionBox-title {
  flex: 1;
}
.ViewOptionBox-items-list-item-select {
  min-width: 104px;
}
.ViewOptionBox-items-list-item-select-property {
  flex: 1;
  min-width: 120px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  max-width: 172px;
}
.ViewOptionBox-items-list-item-input {
  width: 150px !important;
}
.ViewOptionButton-additional-button {
  display: flex;
  gap: 5px;
  --button-padding: 5px 10px !important;
  --button-border-radius: 4px !important;
}
.ViewOptionButton-without-items {
  border-top: none;
}
</style>

<template>
  <div class="ViewPropertiesBox">
    <div class="ViewPropertiesBox-fields-list-item">
      <div class="ViewPropertiesBox-fields-list-item-drag hidden">
        <i class="ri-draggable"></i>
      </div>
      <div class="ViewPropertiesBox-fields-list-item-field">
        <form-check-box
          :caption="$t('common.dialogs.selectAll')"
          :value="isAllSelected"
          @input="selectAll($event)"
        ></form-check-box>
      </div>
    </div>
    <sortable-list
      class="ViewPropertiesBox-fields-list"
      :list="viewProps"
      :id-key="'prop'"
      handle-selector=".ViewPropertiesBox-fields-list-item-drag"
      @update:list="changeList($event)"
    >
      <template #default="{ item, index }">
        <div class="ViewPropertiesBox-fields-list-item">
          <div class="ViewPropertiesBox-fields-list-item-drag">
            <i class="ri-draggable"></i>
          </div>
          <div class="ViewPropertiesBox-fields-list-item-field">
            <form-check-box
              :caption="item.title"
              :value="item.isSelected"
              class="ViewPropertiesBox-checkbox"
              @input="changeCheckBox(index, $event)"
            >
              <div class="ViewPropertiesBox-checkbox-caption">
                <div class="ViewPropertiesBox-checkbox-caption-name">
                  <caption-string :value="item.title"></caption-string>
                </div>
                <!-- <caption-string
                  class="ViewPropertiesBox-checkbox-caption-title"
                  :value="item.name"
                ></caption-string> -->
              </div>
            </form-check-box>
          </div>
        </div>
      </template>
    </sortable-list>
    <div v-if="$slots.append" class="ViewPropertiesBox-additionalOptions">
      <slot name="append"></slot>
    </div>
  </div>
</template>

<script lang="ts" type="text/ecmascript-6">
import { defineComponent } from 'vue';
import FormCheckBox from '../../Form/FormCheckBox.vue';
import SortableList from '../../Common/SortableList.vue';
import CaptionString from '../../Common/CaptionString.vue';
import type { ViewProperty } from '../../GameDesign/WorkspaceCollectionContent';

export default defineComponent({
  name: 'ViewPropertiesBox',
  components: {
    FormCheckBox,
    SortableList,
    CaptionString,
  },
  props: {
    viewProps: {
      type: Array<ViewProperty>,
      default: () => [],
    },
  },
  emits: ['update:list'],
  computed: {
    isAllSelected() {
      return !this.viewProps.some((el) => el.isSelected === false);
    },
  },
  methods: {
    selectAll(val: boolean) {
      const new_fields = this.viewProps.map((el) => {
        return {
          ...el,
          isSelected: val,
        };
      });
      this.$emit('update:list', new_fields);
    },
    async changeCheckBox(index: number, value: boolean) {
      await new Promise((res) => setTimeout(res, 1)); // NOTE: prevent dropdown disappering after checkbox click
      const new_fields = [...this.viewProps];
      new_fields[index] = {
        ...this.viewProps[index],
        isSelected: value,
      };
      this.$emit('update:list', new_fields);
    },
    changeList(new_fields: ViewProperty[]) {
      this.$emit('update:list', new_fields);
    },
  },
});
</script>
<style lang="scss" scoped>
.ViewPropertiesBox {
  padding: 5px 10px 0px 10px;
}
.ViewPropertiesBox-field-caption {
  text-align: center;
  margin-bottom: 5px;
  position: relative;
  padding: 0px 20px;
}
.ViewPropertiesBox-fields-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 5px auto;
}
.ViewPropertiesBox-fields-list-item {
  display: flex;
  align-items: center;

  .ViewPropertiesBox-fields-list-item-drag {
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

  .ViewPropertiesBox-fields-list-item-field {
    flex: 1;
    overflow: hidden;
    width: 100%;
    white-space: nowrap;
    text-overflow: ellipsis;

    .ViewPropertiesBox-checkbox-caption {
      display: flex;
      flex-direction: column;

      .ViewPropertiesBox-checkbox-caption-title {
        font-size: 12px;
        line-height: 1;
        color: var(--local-sub-text-color);
      }
    }
  }
  .ViewPropertiesBox-fields-list-item-manage {
    display: flex;
    flex-shrink: 0;
  }
}
.ViewPropertiesBox-field {
  margin-bottom: 10px;
}

.ViewPropertiesBox-additionalOptions {
  border: none;
  border-top: 1px solid var(--local-text-color);
  padding-top: 5px;
  margin: 5px 0;
}

.ViewPropertiesBox-additionalOptions-item {
  display: flex;
  gap: 5px;
  --button-padding: 5px 10px !important;
  --button-border-radius: 4px !important;
}
</style>

<template>
  <menu-button class="FormSelectCategory">
    <template #button="{ toggle }">
      <button
        class="is-button FormSelectCategory-button"
        :disabled="disabled"
        :title="
          modelValue?.Title
            ? taskCategoryTitle(modelValue.Title)
            : $t('translatedTitles.TaskCategory')
        "
        @click="toggle"
      >
        <i
          v-if="iconOnly || (!iconOnly && modelValue)"
          :class="
            modelValue ? getCategoryIcon(modelValue.Name) : 'ri-list-check'
          "
        ></i>
        <caption-string
          v-if="!iconOnly"
          class="FormSelectCategory-label-title"
          :value="modelValue?.Title"
        ></caption-string>
      </button>
    </template>
    <menu-list :menu-list="menuList"></menu-list>
  </menu-button>
</template>

<script type="text/ecmascript-6" lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import CaptionString from '../Common/CaptionString.vue';
import MenuButton from '../Common/MenuButton.vue';
import MenuList from '../Common/MenuList.vue';
import type { MenuListItem } from '../../logic/types/MenuList';
import TaskManager from '../../logic/managers/TaskManager';
import type { AssetPropValueEnum } from '../../logic/types/Props';
import { convertTranslatedTitle } from '../../logic/utils/assets';

export default defineComponent({
  title: 'FormSelectCategory',
  components: {
    CaptionString,
    MenuButton,
    MenuList,
  },
  props: {
    modelValue: {
      type: [Object, null] as PropType<AssetPropValueEnum | null>,
      required: true,
    },
    options: {
      type: Array as PropType<AssetPropValueEnum[]>,
      required: true,
    },
    iconOnly: {
      type: Boolean,
      required: false,
      default: false,
    },
    dashedBorders: {
      type: Boolean,
      required: false,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['input'],
  computed: {
    menuList(): MenuListItem[] {
      const menu_list: MenuListItem[] = this.options.map((category) => {
        return {
          title: this.taskCategoryTitle(category.Title),
          action:
            this.modelValue?.Name !== category.Name
              ? () => this.$emit('input', category)
              : undefined,
          icon: this.getCategoryIcon(category.Name) ?? undefined,
        };
      });
      if (this.modelValue !== null) {
        menu_list.unshift({
          title: this.$t('boardPage.delete'),
          danger: true,
          icon: 'delete',
          action: () => this.$emit('input', null),
        });
      }
      return menu_list;
    },
  },
  methods: {
    taskCategoryTitle(title: string | null) {
      return title ? convertTranslatedTitle(title, (key) => this.$t(key)) : '';
    },
    getCategoryIcon(name: string) {
      return this.$getAppManager().get(TaskManager).getTaskCategoryIcon(name);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.is-button.FormSelectCategory-button {
  --button-border-radius: 4px 0px 0px 4px !important;
}
</style>

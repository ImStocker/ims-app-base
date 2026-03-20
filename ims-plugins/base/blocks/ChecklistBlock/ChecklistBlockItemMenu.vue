<template>
  <div class="ChecklistBlockItemMenu" :class="{ active: shown }">
    <menu-button>
      <menu-list :menu-list="menuList"></menu-list>
    </menu-button>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType, type UnwrapRef } from 'vue';
import type { ChecklistBlockItemObject } from './ChecklistBlock';
import MenuButton from '#components/Common/MenuButton.vue';
import MenuList from '#components/Common/MenuList.vue';
import UiManager from '#logic/managers/UiManager';
import type ChecklistBlockVM from './ChecklistBlockVM';

export default defineComponent({
  name: 'ChecklistBlockItemMenu',
  components: {
    MenuButton,
    MenuList,
  },
  props: {
    item: {
      type: Object as PropType<ChecklistBlockItemObject>,
      required: true,
    },
    vm: {
      type: Object as PropType<UnwrapRef<ChecklistBlockVM>>,
      required: true,
    },
    shown: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    menuList() {
      return [
        {
          danger: true,
          title: this.$t('boardPage.tasks.deleteItem'),
          action: async () =>
            await this.$getAppManager()
              .get(UiManager)
              .doTask(async () => {
                this.vm.deleteEntryByKey(this.item.key);
              }),
          icon: 'delete',
        },
      ];
    },
  },
});
</script>
<style lang="scss" scoped>
.ChecklistBlockItemMenu {
  opacity: 0;

  &.active {
    opacity: 1;
  }
}
</style>

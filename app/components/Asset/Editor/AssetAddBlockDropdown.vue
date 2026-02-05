<template>
  <menu-button class="AddBlockDropdown">
    <template #button="{ toggle }">
      <button
        class="is-button is-button-dotted AddBlockDropdown-button"
        @click="toggle"
      >
        <i class="ri-add-box-fill"></i>
        {{ $t('gddPage.addBlock') }}
      </button>
    </template>
    <menu-list class="AddBlockDropdown-list" :menu-list="menuList"></menu-list>
  </menu-button>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import MenuButton from '../../Common/MenuButton.vue';
import MenuList from '../../Common/MenuList.vue';
import EditorManager from '../../../logic/managers/EditorManager';

export default defineComponent({
  name: 'AddBlockDropdown',
  components: {
    MenuButton,
    MenuList,
  },
  emits: ['create-block'],
  computed: {
    blockTypes() {
      return this.$getAppManager()
        .get(EditorManager)
        .getBlockTypesList()
        .filter((x) => !x.hideInAdding);
    },
    menuList() {
      return this.blockTypes.map((block) => {
        return {
          title: this.$t('blockTypes.titles.' + block.name),
          icon: 'ri-' + block.icon,
          action: () => this.$emit('create-block', block.name),
        };
      });
    },
  },
});
</script>
<style lang="scss">
.AddBlockDropdown-list {
  width: var(--DropdownContainer-attachToElement-width);
}
</style>
<style lang="scss" scoped>
.AddBlockDropdown {
  font-family: var(--local-font-family);
  font-size: var(--local-font-size);
  font-weight: 500;
  text-transform: none;
  margin: 0px var(--editor-block-padding-right) 0
    var(--editor-block-padding-left);

  .AddBlockDropdown-button {
    width: 100%;
    justify-content: center;
    padding: 0.8em 0.66em;
  }
}
</style>

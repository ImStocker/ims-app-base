<template>
  <menu-button class="AddBlockDropdown">
    <template #button="{ toggle }">
      <button class="AddBlockDropdown-button" @click="toggle">
        <i class="ri-add-box-fill"></i>
        {{ $t('gddPage.addBlock') }}
      </button>
    </template>
    <add-block-menu-body
      @select="$emit('create-block', $event)"
      @paste-blocks="$emit('paste-blocks')"
    ></add-block-menu-body>
  </menu-button>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import MenuButton from '../../Common/MenuButton.vue';
import AddBlockMenuBody from './AddBlockMenuBody.vue';

export default defineComponent({
  name: 'AddBlockDropdown',
  components: {
    MenuButton,
    AddBlockMenuBody,
  },
  emits: ['create-block', 'paste-blocks'],
});
</script>
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
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px;
    border: 1.5px dashed var(--local-border-color);
    border-radius: 12px;
    background: transparent;
    color: var(--local-sub-text-color);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition:
      color 0.15s ease,
      border-color 0.15s ease,
      background 0.15s ease;

    i {
      font-size: 17px;
    }

    &:hover,
    &.is-open {
      color: var(--color-accent);
      border-color: var(--color-accent);
      background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    }
  }
}
</style>

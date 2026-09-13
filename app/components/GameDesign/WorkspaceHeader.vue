<template>
  <div class="WorkspaceHeader">
    <div v-if="isRenamingInProcNewTitle" class="loaderBarFloat"></div>
    <div class="WorkspaceHeader-header">
      <div class="WorkspaceHeader-title">
        <div class="WorkspaceHeader-icon-box">
          <i class="WorkspaceHeader-title-icon" :class="iconClass"></i>
        </div>
        <div class="WorkspaceHeader-titles">
          <div class="App-header">
            <renamable-text
              v-model:is-renaming-mode-state="isRenaming"
              :value="title ?? ''"
              :disabled="!canRename"
              @change="doRename"
            >
              <h1 :title="canRename ? $t('gddPage.dblClickToRename') : ''">
                <caption-string :value="displayingTitle"></caption-string>
              </h1>
            </renamable-text>
          </div>
        </div>
      </div>
      <div class="WorkspaceHeader-manage">
        <slot name="manageStart"></slot>
        <button
          v-if="showShare"
          class="is-button is-button-icon WorkspaceHeader-manage-share"
          :title="$t('gddPage.share')"
          @click="$emit('share')"
        >
          <i class="ri-share-fill"></i>
        </button>
        <menu-button v-if="menuList.length > 0">
          <menu-list :menu-list="menuList">
            <template #item-createElement>
              <slot name="item-createElement"></slot>
            </template>
            <template #item-createFolder>
              <slot name="item-createFolder"></slot>
            </template>
          </menu-list>
        </menu-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import RenamableText from '../Common/RenamableText.vue';
import CaptionString from '../Common/CaptionString.vue';
import MenuButton from '../Common/MenuButton.vue';
import MenuList from '../Common/MenuList.vue';
import type { ExtendedMenuListItem } from '../../logic/types/MenuList';

export default defineComponent({
  name: 'WorkspaceHeader',
  components: {
    RenamableText,
    CaptionString,
    MenuButton,
    MenuList,
  },
  props: {
    iconClass: { type: String, required: true },
    title: {
      type: String as PropType<string | null>,
      default: null,
    },
    canRename: { type: Boolean, default: false },
    showShare: { type: Boolean, default: false },
    menuList: {
      type: Array as PropType<ExtendedMenuListItem[]>,
      default: () => [],
    },
    onRename: {
      type: [Function, null] as PropType<
        ((title: string) => Promise<void>) | null
      >,
      default: null,
    },
  },
  emits: ['share'],
  data() {
    return {
      isRenaming: false,
      isRenamingInProcNewTitle: null as string | null,
    };
  },
  computed: {
    displayingTitle(): string {
      return this.isRenamingInProcNewTitle ?? this.title ?? '';
    },
  },
  methods: {
    async doRename(new_title: string) {
      if (!this.onRename) return;
      this.isRenamingInProcNewTitle = new_title;
      try {
        await this.onRename(new_title);
      } finally {
        this.isRenamingInProcNewTitle = null;
      }
    },
  },
});
</script>

<style lang="scss" scoped>
@use '$style/asset-icons';

.WorkspaceHeader {
  width: 100%;
}
.WorkspaceHeader-header {
  display: flex;
  gap: 10px;
  align-items: center;
  flex: 1;
  flex-wrap: wrap;
}
.WorkspaceHeader-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;

  .App-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 0px;
  }
}
.WorkspaceHeader-icon-box {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  color: var(--color-accent);
  font-size: 18px;
}
.WorkspaceHeader-title-icon {
  @include asset-icons.asset-icons;
}
.WorkspaceHeader-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  h1,
  :deep(.ImsTextInput) {
    font-size: 17px;
    font-weight: 600;
    color: var(--local-text-color);
    line-height: 1.2em;

    @media (max-width: 700px) {
      font-size: var(--local-font-size);
    }
  }
}
.WorkspaceHeader-manage {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;

  :deep(.is-button-dropdown) {
    --button-font-size: 20px;
  }
}
.WorkspaceHeader-manage-share {
  --button-font-size: 20px;
}
</style>

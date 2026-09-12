<template>
  <menu-button
    v-if="canChange"
    class="AssetIconColorControl AssetIconColorControl-menu"
  >
    <template #button="{ toggle }">
      <button
        class="AssetIconColorControl-box AssetIconColorControl-box-btn"
        :style="iconBoxStyle"
        @click="toggle"
      >
        <i :class="renderIconClass" class="AssetIconColorControl-icon"></i>
      </button>
    </template>
    <menu-list :menu-list="menuList"></menu-list>
  </menu-button>
  <div v-else class="AssetIconColorControl-box" :style="iconBoxStyle">
    <i :class="renderIconClass" class="AssetIconColorControl-icon"></i>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import MenuButton from '../Common/MenuButton.vue';
import MenuList from '../Common/MenuList.vue';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import UiManager from '../../logic/managers/UiManager';
import DialogManager from '../../logic/managers/DialogManager';
import SelectAssetIconDialog from './SelectAssetIconDialog.vue';
import SelectAssetColorDialog from './SelectAssetColorDialog.vue';
import { BLOCK_NAME_META, BLOCK_TYPE_META } from '../../logic/constants';
import { resolveAssetIconColor } from '../../logic/utils/assetIconColors';

export default defineComponent({
  name: 'AssetIconColorControl',
  components: {
    MenuButton,
    MenuList,
  },
  props: {
    assetIconClass: { type: String, default: '' },
    assetColorName: {
      type: String as PropType<string | null>,
      default: null,
    },
    canChange: { type: Boolean, default: false },
    applySave: { type: Boolean, default: false },
    assetId: { type: String, default: undefined },
  },
  emits: ['update:assetIconClass', 'update:assetColorName'],
  computed: {
    iconName(): string | null {
      const cls = this.assetIconClass;
      return cls.startsWith('asset-icon-')
        ? cls.slice('asset-icon-'.length)
        : null;
    },
    renderIconClass(): string {
      return this.assetIconClass || 'asset-icon-file-fill';
    },
    assetColor(): string | null {
      const theme = this.$getAppManager().get(UiManager).getColorTheme();
      return resolveAssetIconColor(this.assetColorName, theme);
    },
    iconBoxStyle() {
      if (!this.assetColor) return null;
      return {
        backgroundColor: `color-mix(in srgb, ${this.assetColor} 25%, transparent)`,
        color: this.assetColor,
      };
    },
    menuList() {
      return [
        {
          title: this.$t('assetEditor.changeIcon'),
          icon: 'ri-image-2-line',
          action: () => this.changeIcon(),
        },
        {
          title: this.$t('assetEditor.changeColor'),
          icon: 'ri-palette-line',
          action: () => this.changeColor(),
        },
      ];
    },
  },
  methods: {
    async changeIcon() {
      if (!this.canChange) return;
      const res = await this.$getAppManager()
        .get(DialogManager)
        .show(SelectAssetIconDialog, {
          assetId: this.assetId,
          value: this.iconName,
        });
      if (res === undefined) return;
      if (this.applySave && this.assetId) {
        await this.$getAppManager()
          .get(UiManager)
          .doTask(async () => {
            await this.$getAppManager()
              .get(CreatorAssetManager)
              .changeAssets({
                where: {
                  id: [this.assetId as string],
                },
                set: {
                  icon: res,
                },
              });
          });
      }
      this.$emit('update:assetIconClass', 'asset-icon-' + (res || 'file-fill'));
    },
    async changeColor() {
      if (!this.canChange) return;
      const res = await this.$getAppManager()
        .get(DialogManager)
        .show(SelectAssetColorDialog, {
          assetId: this.assetId,
          value: this.assetColorName,
        });
      if (res === undefined) return;
      if (this.applySave && this.assetId) {
        await this.$getAppManager()
          .get(UiManager)
          .doTask(async () => {
            await this.$getAppManager()
              .get(CreatorAssetManager)
              .changeAssets({
                where: {
                  id: [this.assetId as string],
                },
                set: {
                  blocks: {
                    [BLOCK_NAME_META]: {
                      name: BLOCK_NAME_META,
                      type: BLOCK_TYPE_META,
                      props: {
                        color: res,
                      },
                    },
                  },
                },
              });
          });
      }
      this.$emit('update:assetColorName', res);
    },
  },
});
</script>

<style lang="scss" scoped>
@use '$style/asset-icons';

.AssetIconColorControl-menu {
  flex: none;
  display: inline-flex;
}
.AssetIconColorControl-box {
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
.AssetIconColorControl-box-btn {
  border: none;
  padding: 0;
  cursor: pointer;
  transition: filter 0.15s ease;

  &:hover {
    filter: brightness(1.2);
  }
}
.AssetIconColorControl-icon {
  @include asset-icons.asset-icons;
}
</style>

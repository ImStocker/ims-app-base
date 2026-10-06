<template>
  <menu-button
    v-if="canChange"
    class="EntityIconColorControl EntityIconColorControl-menu"
  >
    <template #button="{ toggle }">
      <button
        class="EntityIconColorControl-box EntityIconColorControl-box-btn"
        :style="iconBoxStyle"
        @click="toggle"
      >
        <i :class="renderIconClass" class="EntityIconColorControl-icon"></i>
      </button>
    </template>
    <menu-list :menu-list="menuList"></menu-list>
  </menu-button>
  <div v-else class="EntityIconColorControl-box" :style="iconBoxStyle">
    <i :class="renderIconClass" class="EntityIconColorControl-icon"></i>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import MenuButton from '../Common/MenuButton.vue';
import MenuList from '../Common/MenuList.vue';
import UiManager from '../../logic/managers/UiManager';
import DialogManager from '../../logic/managers/DialogManager';
import SelectAssetIconDialog from './SelectAssetIconDialog.vue';
import SelectAssetColorDialog from './SelectAssetColorDialog.vue';
import { resolveAssetIconColor } from '../../logic/utils/assetIconColors';
import type { EntityAppearance } from '../../logic/types/EntityAppearance';

export default defineComponent({
  name: 'EntityIconColorControl',
  components: {
    MenuButton,
    MenuList,
  },
  props: {
    iconClass: { type: String, default: '' },
    colorName: {
      type: String as PropType<string | null>,
      default: null,
    },
    canChange: { type: Boolean, default: false },
    save: {
      type: [Function, null] as PropType<
        ((params: EntityAppearance) => Promise<void>) | null
      >,
      default: null,
    },
  },
  emits: ['update:iconClass', 'update:colorName'],
  computed: {
    iconName(): string | null {
      const cls = this.iconClass;
      return cls.startsWith('asset-icon-')
        ? cls.slice('asset-icon-'.length)
        : null;
    },
    renderIconClass(): string {
      return this.iconClass || 'asset-icon-file-fill';
    },
    entityColor(): string | null {
      const theme = this.$getAppManager().get(UiManager).getColorTheme();
      return resolveAssetIconColor(this.colorName, theme);
    },
    iconBoxStyle() {
      if (!this.entityColor) return null;
      return {
        backgroundColor: `color-mix(in srgb, ${this.entityColor} 25%, transparent)`,
        color: this.entityColor,
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
          value: this.iconName,
        });
      if (res === undefined) return;
      const save = this.save;
      if (save) {
        await this.$getAppManager()
          .get(UiManager)
          .doTask(async () => {
            await save({ icon: res });
          });
      }
      this.$emit('update:iconClass', 'asset-icon-' + (res || 'file-fill'));
    },
    async changeColor() {
      if (!this.canChange) return;
      const res = await this.$getAppManager()
        .get(DialogManager)
        .show(SelectAssetColorDialog, {
          value: this.colorName,
        });
      if (res === undefined) return;
      const save = this.save;
      if (save) {
        await this.$getAppManager()
          .get(UiManager)
          .doTask(async () => {
            await save({ color: res });
          });
      }
      this.$emit('update:colorName', res);
    },
  },
});
</script>

<style lang="scss" scoped>
@use '$style/asset-icons';

.EntityIconColorControl-menu {
  flex: none;
  display: inline-flex;
}
.EntityIconColorControl-box {
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
.EntityIconColorControl-box-btn {
  border: none;
  padding: 0;
  cursor: pointer;
  transition: filter 0.15s ease;

  &:hover {
    filter: brightness(1.2);
  }
}
.EntityIconColorControl-icon {
  @include asset-icons.asset-icons;
}
</style>

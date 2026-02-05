<template>
  <props-block-sheet-print
    v-if="displayMode === 'print'"
    :form-def="formDef"
    :form-state="formState"
  ></props-block-sheet-print>
  <div v-else class="AssetEditorPropsBlock_Sheet">
    <template v-for="ent of formDef.fields" :key="ent.propKey">
      <props-block-prop
        :ref="(el) => setEntryRef(ent, 'prop', el)"
        :edit-mode="editStructure"
        class="AssetEditorPropsBlock_Sheet-cell type-prop"
        :model-value="ent.propTitle"
        :same-value="true"
        :computed-state="true"
        :class="{
          'state-inherited': displayMode === 'normal' && ent.inheritedProp,
        }"
        :title="getEntryPropTooltip(ent)"
        :validate-value="(val) => validatePropName(ent.propKey, val)"
        :data-prop-key="ent.propKey"
        @update:model-value="changeProp(ent, $event)"
        @tab="onPropTab(ent, $event)"
        @pre-enter="onPropTab(ent, { shiftKey: false })"
        @mouseenter="onPropMouseEnter"
        @mouseleave="onPropMouseLeave"
        @click="selectProp(ent)"
      >
        <template v-if="editStructure" #menu>
          <menu-button
            class="AssetEditorPropsBlock_Sheet-propCell-menu"
            :class="{ 'state-active': shownDropdownMenuIdx === ent.index }"
            @show="shownDropdownMenuIdx = ent.index"
            @hide="shownDropdownMenuIdx = null"
          >
            <menu-list :menu-list="getMenuList(ent)"> </menu-list>
          </menu-button>
        </template>
      </props-block-prop>
      <props-block-value-stack
        :ref="(el) => setEntryRef(ent, 'value', el)"
        :form-state="formState"
        :edit-mode="editMode"
        class="AssetEditorPropsBlock_Sheet-cell type-value"
        :field="ent"
        @change-props="$emit('changeProps', $event)"
        @click="selectProp(ent)"
      ></props-block-value-stack>
    </template>
    <div
      v-if="formDef.differentFieldsNum > 0"
      class="AssetEditorPropsBlock_Sheet-different"
    >
      {{
        $t('assetEditor.differentPropsNum', {
          num: formDef.differentFieldsNum,
        })
      }}
    </div>
    <overlay-element
      v-if="hoverProp && editStructure"
      :attach-to-element="hoverProp.element"
      attach-position="left"
      class="AssetEditorPropsBlock_Sheet-addRow"
      @mouseleave="onPropOverlayMouseLeave"
      @click="addPropHoverPropButton"
    >
      <button
        :title="$t('assetEditor.propsBlockAddPropertyAfter')"
        class="is-button is-button-icon-small"
      >
        <i class="ri-add-box-fill"></i>
      </button>
    </overlay-element>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent, shallowRef } from 'vue';
import UiManager from '#logic/managers/UiManager';
import {
  type AssetPropValue,
  castAssetPropValueToString,
} from '#logic/types/Props';
import {
  convertTranslatedTitle,
  type AssetDisplayMode,
} from '#logic/utils/assets';
import PropsBlockProp from './PropsBlockProp.vue';
import PropsBlockValueStack from './PropsBlockValueStack.vue';
import type {
  PropsFormDef,
  PropsFormFieldDef,
  PropsFormState,
} from '#logic/types/PropsForm';
import OverlayElement from '#components/Common/OverlayElement.vue';
import MenuButton from '#components/Common/MenuButton.vue';
import MenuList from '#components/Common/MenuList.vue';
import type { MenuListItem } from '#logic/types/MenuList';
import PropsBlockSheetPrint from './PropsBlockSheetPrint.vue';
import { clipboardReadPlainText } from '#logic/utils/clipboard';
import { getBetweenIndexWithTimestamp } from '#components/Asset/Editor/blockUtils';

export default defineComponent({
  name: 'AssetEditorPropsBlockSheet',
  components: {
    PropsBlockProp,
    PropsBlockValueStack,
    OverlayElement,
    MenuButton,
    MenuList,
    PropsBlockSheetPrint,
  },
  props: {
    editMode: {
      type: Boolean,
      default: false,
    },
    editStructure: {
      type: Boolean,
      default: false,
    },
    formState: {
      type: Object as PropType<PropsFormState>,
      required: true,
    },
    formDef: {
      type: Object as PropType<PropsFormDef>,
      required: true,
    },
    validatePropName: {
      type: Function as PropType<(key: string, val: string) => string | null>,
      default() {
        return () => null;
      },
    },
    displayMode: {
      type: String as PropType<AssetDisplayMode>,
      default: () => 'normal',
    },
  },
  emits: [
    'changeProps',
    'save',
    'discard',
    'renameProp',
    'copyProp',
    'duplicateProp',
    'deleteProp',
    'addProp',
    'selectProp',
    'changeSettingsProp',
    'changeServiceName',
    'pasteProp',
  ],
  data() {
    return {
      entryRefs: shallowRef({
        prop: new Map<string, any>(),
        value: new Map<string, any>(),
      }),
      hoverProp: null as {
        element: HTMLElement;
        propKey: string;
      } | null,
      shownDropdownMenuIdx: null as number | null,
    };
  },
  methods: {
    getMenuList(ent: PropsFormFieldDef) {
      return [
        {
          title: this.$t('assetEditor.changeSettings'),
          action: () => this.changeSettingsProp(ent),
          icon: 'settings',
        },
        {
          title: this.$t('assetEditor.blockMenu.setServiceName'),
          action: () => this.setServiceName(ent),
          icon: 'serviceName',
        },
        {
          title: this.$t('assetEditor.propsBlockAddPropertyAfter'),
          action: () => this.addProp(ent.propKey),
        },
        {
          title: this.$t('assetEditor.duplicateProp'),
          action: () => this.duplicateProp(ent),
        },
        {
          title: this.$t('assetEditor.copyProp'),
          action: () => this.copyProp(ent),
          icon: 'copy',
        },
        {
          title: this.$t('assetEditor.pasteProp'),
          action: async () => await this.pasteProp(ent.propKey),
          icon: 'ri-clipboard-line',
        },
        {
          title: this.$t('assetEditor.blockMenu.delete'),
          action: () => this.deleteProp(ent),
          danger: true,
          icon: 'delete',
        },
      ].filter((x) => x) as MenuListItem[];
    },
    setServiceName(entry: PropsFormFieldDef) {
      this.$emit('changeServiceName', {
        key: entry.propKey,
        name: entry.propName,
      });
    },
    copyProp(entry: PropsFormFieldDef) {
      this.$emit('copyProp', {
        key: entry.propKey,
      });
    },
    duplicateProp(entry: PropsFormFieldDef) {
      this.$emit('duplicateProp', {
        key: entry.propKey,
      });
    },
    async pasteProp(key: string) {
      try {
        const clipboard_text = await clipboardReadPlainText();
        const parsed = clipboard_text ? JSON.parse(clipboard_text) : null;
        if (!parsed || !parsed.type || parsed.type !== 'prop') {
          throw Error(this.$t('assetEditor.propsBlockPasteFromBufferEmpty'));
        }
        this.$emit('pasteProp', {
          key,
          prop: parsed.content.prop,
          value: parsed.content.value,
        });
      } catch (err: any) {
        this.$getAppManager().get(UiManager).showError(err);
      }
    },
    changeProp(entry: PropsFormFieldDef, val: AssetPropValue) {
      const new_prop_str = castAssetPropValueToString(val);
      this.$emit('renameProp', {
        key: entry.propKey,
        title: new_prop_str,
      });
    },
    onPropKeyRenamed(old_prop_key: string, new_prop_key: string) {
      if (this.hoverProp && this.hoverProp.propKey === old_prop_key) {
        this.hoverProp.propKey = new_prop_key;
      }
    },
    deleteProp(entry: PropsFormFieldDef) {
      this.$emit('deleteProp', {
        key: entry.propKey,
      });
    },
    selectProp(entry: PropsFormFieldDef) {
      this.$emit('selectProp', {
        key: entry.propKey,
      });
    },
    changeSettingsProp(entry: PropsFormFieldDef) {
      this.$emit('changeSettingsProp', {
        key: entry.propKey,
      });
    },
    getEntryPropTooltip(entry: PropsFormFieldDef): string {
      const val = convertTranslatedTitle(entry.propTitle, (key) =>
        this.$t(key),
      );
      return val + '\n\n' + this.$t('assetEditor.textBlockChangeText');
    },
    setEntryRef(entry: PropsFormFieldDef, kind: 'prop' | 'value', el: any) {
      if (!el) this.entryRefs[kind].delete(entry.propKey);
      else this.entryRefs[kind].set(entry.propKey, el);
    },
    async onPropTab(entry: PropsFormFieldDef, ev: { shiftKey: boolean }) {
      const index = this.formDef.fields.indexOf(entry);
      await this.$getAppManager().get(UiManager).blurActiveElement();
      await new Promise((res) => setTimeout(res, 10));
      const upd_entry = this.formDef.fields[ev.shiftKey ? index - 1 : index];
      if (!upd_entry) return;
      const value_input = this.entryRefs.value.get(upd_entry.propKey);
      if (value_input) {
        value_input.focus();
      }
    },
    async onPropValueEnter(entry: PropsFormFieldDef) {
      const index = this.formDef.fields.indexOf(entry);
      await this.$getAppManager().get(UiManager).blurActiveElement();
      await new Promise((res) => setTimeout(res, 10));
      this.focusCell(index + 1, 'value');
    },
    focusCell(row: number, kind: 'prop' | 'value') {
      const entry = this.formDef.fields[row];
      if (!entry) return;
      const cell = this.entryRefs[kind].get(entry.propKey);
      if (!cell) return;
      cell.focus();
      this.selectProp(entry);
    },
    getPropKeyByElement(el: HTMLElement): string | null {
      const ents = this.entryRefs['prop'].entries();
      for (const [key, val] of ents) {
        if (val.$el === el) {
          return key;
        }
      }
      return null;
    },
    addProp(afterProp: string | null) {
      const ind = this.formDef.fields.findIndex((x) => x.propKey === afterProp);
      if (ind >= 0 && ind < this.formDef.fields.length - 1) {
        const cur_index = this.formDef.fields[ind].index;
        const next_index = this.formDef.fields[ind + 1].index;
        const new_index = getBetweenIndexWithTimestamp(cur_index, next_index);
        this.$emit('addProp', {
          index: new_index,
        });
      } else {
        this.$emit('addProp');
      }
    },
    addPropHoverPropButton() {
      if (!this.hoverProp) return;
      this.addProp(this.hoverProp.propKey);
    },
    onPropMouseEnter(e: MouseEvent) {
      const closest = (e.target as HTMLElement).closest<HTMLElement>(
        '.AssetEditorPropsBlock_Sheet-cell.type-prop',
      );
      if (closest) {
        this.hoverProp = {
          element: closest,
          propKey: closest.dataset.propKey ?? '',
        };
      } else this.hoverProp = null;
    },
    onPropMouseLeave(e: MouseEvent) {
      if (this.hoverProp && this.hoverProp.element === e.target) {
        const to = e.relatedTarget
          ? (e.relatedTarget as HTMLElement).closest(
              '.AssetEditorPropsBlock_Sheet-addRow',
            )
          : null;
        if (!to) {
          this.hoverProp = null;
        }
      }
    },
    onPropOverlayMouseLeave(_e: MouseEvent) {
      this.hoverProp = null;
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins.scss';

.AssetEditorPropsBlock_Sheet {
  display: grid;
  grid-template-columns: min(30%, 200px) 1fr;
  gap: 1px;
  background-color: var(--local-border-color);
  padding: 1px;

  @include devices-mixins.device-type(not-pc) {
    grid-template-columns: 125px 1fr;
  }
}

.AssetEditorPropsBlock_Sheet-different {
  background: var(--local-bg-color);
  padding: 5px 20px;
  text-align: center;
  font-style: italic;
  color: #999;
  grid-column: 1/3;
}

.AssetEditorPropsBlock_Sheet-cell {
  background: var(--local-bg-color);
  min-width: 0;

  &.state-inherited {
    &.type-value {
      color: var(--color-inherited-value);
    }

    &.type-prop {
      cursor: default;
    }
  }
}

.AssetEditorPropsBlock_Sheet-add {
  position: absolute;
  left: -20px;
}

.AssetEditorPropsBlock_Sheet-propCell-menu {
  display: none;
}

.AssetEditorPropsBlock_Sheet-cell.type-prop:hover {
  .AssetEditorPropsBlock_Sheet-propCell-menu {
    display: block;
  }
}

.AssetEditorPropsBlock_Sheet-propCell-menu.state-active {
  display: block;
}

:global(.AssetEditorPropsBlock_Sheet-addRow) {
  color: #cccccc;
  display: flex;
  align-items: flex-end;
  cursor: pointer;

  &:hover {
    color: var(--text-intense);
  }
}

.AssetEditorPropsBlock_Sheet-cell.type-prop:deep(.StringPropEditor-input),
.AssetEditorPropsBlock_Sheet-cell.type-prop:deep(
    .AssetEditorPropsBlockProp-static
  ) {
  padding-left: 20px;
}
</style>

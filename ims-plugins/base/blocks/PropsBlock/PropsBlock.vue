<template>
  <div class="AssetEditorPropsBlock" @click="enterEditMode($event)">
    <props-block-sheet
      ref="sheet"
      :edit-mode="editMode"
      :edit-structure="editMode && canEditStructure"
      :block-id="resolvedBlock.id"
      :asset-changer="assetChanger"
      :form-def="formDef"
      :form-state="formState"
      :validate-prop-name="validatePropName"
      :display-mode="displayMode"
      @rename-prop="renameProp($event.key, $event.title)"
      @copy-prop="copyProp($event.key)"
      @duplicate-prop="duplicateProp($event.key)"
      @paste-prop="pasteProp($event.prop, $event.value, $event.key)"
      @delete-prop="deleteProp($event.key)"
      @select-prop="
        changeSettingsPropKey ? changeSettingsProp($event.key) : null
      "
      @change-settings-prop="changeSettingsProp($event.key)"
      @change-service-name="changeServiceName($event.key, $event.name)"
      @change-props="changeBlockProps($event)"
      @add-prop="addNew($event)"
    ></props-block-sheet>
    <right-panel v-if="changeSettingsPropKey">
      <props-block-change-settings
        class="AssetEditorPropsBlock-changeSettingsProp"
        :form-state="formState"
        :prop-key="changeSettingsPropKey"
        :asset-changer="assetChanger"
        :resolved-block="resolvedBlock"
        :props-count="formDef.fields.length"
        @save="save()"
        @rename-prop="renameProp(changeSettingsPropKey, $event)"
        @switch-settings-prop="switchSettingsProp($event)"
        @change-service-name="changeServiceName(changeSettingsPropKey)"
      ></props-block-change-settings>
    </right-panel>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import PropsBlockSheet from './PropsBlockSheet.vue';
import type { PropsBlockExtractedEntries2 } from './PropsBlock';
import {
  extractPropsBlockEntries2,
  extractPropsFormState,
  getEmptyPropsBlockEntry2,
  getPropsBlockUntitledKey2,
  propBlockEntryToAssetPropsPlain,
} from './PropsBlock';
import type {
  PropsFormDef,
  PropsFormFieldDef,
  PropsFormState,
} from '#logic/types/PropsForm';
import {
  assignPlainValueToAssetProps,
  castAssetPropValueToString,
  extractSubObjectAsPlainValue,
  makeBlockRef,
  normalizeAssetPropPart,
  type AssetProps,
  type AssetPropsPlainObjectValue,
} from '#logic/types/Props';
import PropsBlockChangeSettings from './PropsBlockChangeSettings.vue';
import { AssetRights } from '#logic/types/Rights';
import DialogManager from '#logic/managers/DialogManager';
import type { AssetBlockEditorVM } from '#logic/vm/AssetBlockEditorVM';
import type {
  AssetDisplayMode,
  ResolvedAssetBlock,
} from '#logic/utils/assets';
import type { AssetChanger } from '#logic/types/AssetChanger';
import AssetServiceNameDialog from '#components/Asset/AssetServiceNameDialog.vue';
import RightPanel from '#components/Common/RightPanel.vue';
import {
  type SetClickOutsideCancel,
  setImsClickOutside,
} from '#components/utils/ui';
import { generateNextUniqueNameNumber } from '#logic/utils/stringUtils';
import { clipboardCopyPlainText } from '#logic/utils/clipboard';
import UiManager from '#logic/managers/UiManager';
import ConfirmDialog from '#components/Common/ConfirmDialog.vue';
import {
  getNextIndexWithTimestamp,
  getBetweenIndexWithTimestamp,
} from '#components/Asset/Editor/blockUtils';
import {
  isElementInteractive,
  getClosestNodeBySelector,
} from '#components/utils/DomElementUtils';

export default defineComponent({
  name: 'PropsBlock',
  components: {
    PropsBlockSheet,
    PropsBlockChangeSettings,
    RightPanel,
  },
  provide() {
    return {
      structPropEditorStructIds: [],
    };
  },
  props: {
    assetBlockEditor: {
      type: Object as PropType<AssetBlockEditorVM>,
      required: true,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    assetChanger: {
      type: Object as PropType<AssetChanger>,
      required: true,
    },
    rights: {
      type: Number as PropType<AssetRights>,
      required: true,
    },
    resolvedBlock: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
    displayMode: {
      type: String as PropType<AssetDisplayMode>,
      default: () => 'normal',
    },
  },
  emits: ['save', 'discard'],
  data() {
    return {
      clickOutside: null as SetClickOutsideCancel | null,
      changeSettingsPropKey: null as string | null,
      allowChildrenChange: false,
    };
  },
  computed: {
    canEditStructure() {
      return this.rights === AssetRights.FULL_ACCESS;
    },
    formDef(): PropsFormDef {
      return {
        differentFieldsNum: 0,
        fields: this.entries.list,
      };
    },
    formState(): PropsFormState {
      return extractPropsFormState(this.resolvedBlock);
    },
    realEntries(): PropsBlockExtractedEntries2 {
      if (!this.assetBlockEditor.assetEdited) {
        return {
          list: [],
          map: {},
          maxIndex: -1,
        };
      }
      return extractPropsBlockEntries2(
        this.resolvedBlock,
        this.assetBlockEditor.assetEdited.typeIds,
      );
    },
    entries(): PropsBlockExtractedEntries2 {
      const extr = this.realEntries;
      if (extr.list.length === 0) {
        return {
          list: [
            {
              ...getEmptyPropsBlockEntry2('untitled1'),
            },
          ],
          map: extr.map,
          maxIndex: getNextIndexWithTimestamp(0),
        };
      }
      return extr;
    },
    editMode() {
      return this.assetBlockEditor.isBlockEditing(this.resolvedBlock.id);
    },
  },
  watch: {
    editMode() {
      this.changeSettingsPropKey = null;
    },
  },
  unmounted() {
    this.resetGlobalClickOutside(false);
  },
  methods: {
    async _askConfirmNestedChange(
      type: 'change' | 'delete',
    ): Promise<{ allowed: boolean; hasChildren: boolean }> {
      const asset = this.assetBlockEditor.assetFull;
      if (!asset) {
        return {
          allowed: false,
          hasChildren: false,
        };
      }
      const has_children =
        !!(await this.assetBlockEditor.checkHasChildrenViaCache(asset.id));
      if (!this.allowChildrenChange) {
        if (has_children) {
          this.allowChildrenChange = !!(await this.$getAppManager()
            .get(DialogManager)
            .show(
              ConfirmDialog,
              {
                header: this.$t(
                  type === 'change'
                    ? 'assetEditor.propsBlockChildrenChangeHeader'
                    : 'assetEditor.propsBlockChildrenDeleteHeader',
                ),
                message: this.$t(
                  type === 'change'
                    ? 'assetEditor.propsBlockChildrenChangeBody'
                    : 'assetEditor.propsBlockChildrenDeleteBody',
                ),
              },
              this,
            ));
        }
      }
      return {
        hasChildren: has_children,
        allowed: this.allowChildrenChange,
      };
    },
    async renameProp(key: string, new_title: string) {
      //const childrenCheck = await this._askConfirmNestedChange('change');
      //if (!childrenCheck.allowed) {
      //  return;
      //}

      const entry = this.entries.list.find((e) => e.propKey === key);
      if (!entry) return;
      const by_title_key =
        !entry.propTitle || normalizeAssetPropPart(entry.propTitle) === key;

      const op = this.assetChanger.makeOpId();
      if (by_title_key || !new_title) {
        const new_prop_str = new_title;

        let new_prop_key: string;
        if (!new_prop_str)
          new_prop_key = getPropsBlockUntitledKey2(this.entries.list);
        else new_prop_key = normalizeAssetPropPart(new_prop_str);

        this.assetChanger.renameBlockPropKey(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          key,
          new_prop_key,
          op,
        );
        this.assetChanger.renameBlockPropKey(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          `__props\\${key}`,
          `__props\\${new_prop_key}`,
          op,
        );
        this.assetChanger.setBlockPropKey(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          `__props\\${new_prop_key}\\title`,
          new_title,
          op,
        );
        if (this.$refs['sheet']) {
          (this.$refs['sheet'] as any).onPropKeyRenamed(key, new_prop_key);
        }
        if (this.changeSettingsPropKey === key) {
          this.changeSettingsProp(new_prop_key);
        }
      } else {
        this.assetChanger.setBlockPropKey(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          `__props\\${key}\\title`,
          new_title,
          op,
        );
      }
    },
    async changeServiceName(key: string, name?: string) {
      const entry = this.entries.list.find((e) => e.propKey === key);
      if (!entry) return;
      const new_name_raw = await this.$getAppManager()
        .get(DialogManager)
        .show(
          AssetServiceNameDialog,
          {
            header: this.$t('assetEditor.blockMenu.inputServiceName'),
            yesCaption: this.$t('common.dialogs.rename'),
            value: name ?? entry.propName,
            validate: (val: string) => {
              const err = this.validatePropName(
                key,
                normalizeAssetPropPart(val),
              );
              if (err) {
                throw new Error(err);
              }
              return val;
            },
          },
          this,
        );
      if (new_name_raw === undefined || new_name_raw === null) return;

      const new_name = normalizeAssetPropPart(new_name_raw);

      const op = this.assetChanger.makeOpId();
      this.assetChanger.renameBlockPropKey(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        key,
        new_name,
        op,
      );
      this.assetChanger.renameBlockPropKey(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        `__props\\${key}`,
        `__props\\${new_name}`,
        op,
      );
      this.assetChanger.deleteBlockPropKey(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        `__props\\${key}\\name`,
        op,
      );
      this.assetChanger.setBlockPropKey(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        `__props\\${new_name}\\name`,
        new_name_raw,
        op,
      );
      if (this.$refs['sheet']) {
        (this.$refs['sheet'] as any).onPropKeyRenamed(key, new_name);
      }
      if (this.changeSettingsPropKey === key) {
        this.changeSettingsProp(new_name);
      }
    },
    deleteProp(key: string) {
      const op = this.assetChanger.makeOpId();
      this.assetChanger.deleteBlockPropKeys(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        [key, `__props\\${key}`],
        op,
      );
    },
    getPropValue(key: string): AssetPropsPlainObjectValue {
      return extractSubObjectAsPlainValue(this.formState.combined, key);
    },
    async copyProp(key: string) {
      const prop = this.formDef.fields.find((field) => field.propKey === key);
      if (!prop) return;

      const value = this.getPropValue(key);

      const payload = {
        type: 'prop',
        content: {
          prop,
          value,
        },
      };
      await clipboardCopyPlainText(JSON.stringify(payload));
      this.$getAppManager()
        .get(UiManager)
        .showSuccess(this.$t('assetEditor.propsBlockCopied'));
    },
    async pasteProp(
      prop: PropsFormFieldDef,
      value: AssetPropsPlainObjectValue,
      afterKey?: string,
    ) {
      prop = { ...prop };

      // Generate unique title, if prop key already occupied
      const new_title = generateNextUniqueNameNumber(
        prop.propTitle,
        (title) => {
          const val_prop_name =
            prop.propTitle === title
              ? prop.propKey
              : normalizeAssetPropPart(title);
          return !this.entries.list.some(
            (entry) => entry.propKey === val_prop_name,
          );
        },
      );
      prop.propKey =
        prop.propTitle === new_title
          ? prop.propKey
          : normalizeAssetPropPart(new_title);
      prop.propName =
        prop.propTitle === new_title ? prop.propName : prop.propKey;
      prop.propTitle = new_title;

      // Generate index
      prop.index = getNextIndexWithTimestamp(this.entries.maxIndex);
      if (afterKey) {
        const after_prop_ind = this.formDef.fields.findIndex(
          (field) => field.propKey === afterKey,
        );
        if (
          after_prop_ind >= 0 &&
          after_prop_ind < this.formDef.fields.length - 1
        ) {
          const after_prop = this.formDef.fields[after_prop_ind];
          const after_prop_next = this.formDef.fields[after_prop_ind + 1];
          prop.index = getBetweenIndexWithTimestamp(
            after_prop.index,
            after_prop_next.index,
          );
        }
      }

      // Paste data
      const prop_prepared = propBlockEntryToAssetPropsPlain(prop);
      const prop_set: AssetProps = {};
      assignPlainValueToAssetProps(
        prop_set,
        prop_prepared,
        `__props\\${prop.propKey}`,
      );
      assignPlainValueToAssetProps(prop_set, value, `${prop.propKey}`);

      this.assetChanger.setBlockPropKeys(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        prop_set,
      );
      await this.$nextTick();
      if (!this.$refs.sheet) return;

      const ind = this.entries.list.findIndex(
        (e) => e.propKey === `${new_title}`,
      );
      if (ind >= 0) {
        (this.$refs.sheet as any).focusCell(ind, 'prop');
        if (this.changeSettingsPropKey) {
          this.changeSettingsProp(new_title);
        }
      }
    },
    async duplicateProp(key: string) {
      const prop = this.formDef.fields.find((field) => field.propKey === key);
      if (!prop) return;
      const value = this.getPropValue(key);
      await this.pasteProp(prop, value, key);
    },
    changeSettingsProp(key: string) {
      this.changeSettingsPropKey = key;
    },
    switchSettingsProp(shift: number) {
      const index = this.formDef.fields.findIndex(
        (ent) => ent.propKey === this.changeSettingsPropKey,
      );
      if (this.formDef.fields.length > 0 && index > -1) {
        if (index + shift > this.formDef.fields.length - 1) {
          this.changeSettingsPropKey = this.formDef.fields[0].propKey;
        } else if (index + shift < 0) {
          this.changeSettingsPropKey =
            this.formDef.fields[this.formDef.fields.length - 1].propKey;
        } else {
          this.changeSettingsPropKey =
            this.formDef.fields[index + shift].propKey;
        }
      }
    },
    save() {
      this.$emit('save');
      this.assetBlockEditor.exitEditMode();
      this.resetGlobalClickOutside(false);
    },
    async enterEditMode(ev?: MouseEvent) {
      if (this.readonly) return;
      if (this.editMode) return;
      if (ev && isElementInteractive(ev.target as HTMLElement)) return;
      if (this.realEntries.list.length === 0) {
        this.assetChanger.setBlockPropKeys(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          {
            untitled1: null,
            '__props\\untitled1\\index': 1,
            '__props\\untitled1\\title': '',
          },
        );
      }
      this.assetBlockEditor.enterEditMode(this.resolvedBlock.id);
      this.resetGlobalClickOutside(true);
      if (ev) {
        const closest = getClosestNodeBySelector(
          ev.target as Node,
          '.AssetEditorPropsBlock_Sheet-cell, .AssetEditorPropsBlockValueStack-item-value',
          this.$el,
        );
        if (closest) {
          await this.$nextTick();
          const imcFocusAtEvent = new CustomEvent('imc-focus-at', {
            bubbles: true,
            detail: {
              clientX: ev.clientX,
              clientY: ev.clientY,
            },
          });
          closest.dispatchEvent(imcFocusAtEvent);
        }
      }
    },
    async addNew(opts?: { index: number | null }) {
      const untitled_key = getPropsBlockUntitledKey2(this.entries.list);
      this.assetChanger.setBlockPropKeys(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        {
          [untitled_key]: null,
          [`__props\\${untitled_key}\\index`]:
            opts && opts.index !== null
              ? opts.index
              : getNextIndexWithTimestamp(this.entries.maxIndex),
          [`__props\\${untitled_key}\\title`]: '',
        },
      );
      await this.$nextTick();
      if (!this.$refs.sheet) return;
      const ind = this.entries.list.findIndex(
        (e) => e.propKey === `${untitled_key}`,
      );
      if (ind >= 0) {
        (this.$refs.sheet as any).focusCell(ind, 'prop');
      }
      this.changeSettingsPropKey = null;
    },
    resetGlobalClickOutside(restart: boolean) {
      if (this.clickOutside) {
        this.clickOutside();
        this.clickOutside = null;
      }
      if (restart) {
        this.clickOutside = setImsClickOutside(this.$el, () => {
          this.save();
        });
      }
    },
    validatePropName(key: string, val: string) {
      const new_prop_str = castAssetPropValueToString(val);
      let new_prop_key: string;
      if (!new_prop_str)
        new_prop_key = getPropsBlockUntitledKey2(this.entries.list);
      else new_prop_key = normalizeAssetPropPart(new_prop_str);
      if (key === new_prop_key) {
        return null;
      }
      if (this.formDef.fields.some((f) => f.propKey === new_prop_key)) {
        return this.$t('assetEditor.propertyAlreadyExists');
      }
      return null;
    },
    changeBlockProps(changes: AssetProps[]) {
      this.assetChanger.registerBlockPropsChanges(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        changes,
      );
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetEditorPropsBlock {
  position: relative;
  border: 1px solid transparent;

  &.state-edit {
    border-color: var(--color-main-yellow);
  }
}

.AssetEditorPropsBlock-addHover-content {
  text-align: center;
  background: var(--local-hl-bg-color);
  font-size: 12px;
  line-height: 24px;
  cursor: pointer;
  color: #999;
  opacity: 0;
  width: 100%;
  height: 24px;
  pointer-events: none;
  transition: opacity 0.3s;
}

.AssetEditorPropsBlock-addHover {
  position: absolute;
  height: 10px;
  bottom: -11px;
  left: 0;
  right: 0;
  user-select: none;
  z-index: 100;
  border: none;
  display: block;
  background: transparent;

  &:hover,
  &:focus {
    .AssetEditorPropsBlock-addHover-content {
      background: var(--local-hl-bg-color);
      opacity: 1;
      pointer-events: auto;
    }
  }
}

.AssetEditorPropsBlock-addBlock {
  margin-top: 1px;
}

.AssetEditorPropsBlock-changeSettingsProp {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 400px;
  background: var(--local-box-color);
  z-index: 200;
  box-shadow: 0px -10px 10px rgba(0, 0, 0, 0.2);
  padding: 20px 20px 20px;
  --local-bg-color: var(--local-box-color);
}
</style>

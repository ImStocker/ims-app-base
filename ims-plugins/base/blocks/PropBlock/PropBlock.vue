<template>
  <div class="AssetEditorPropBlock" @click="enterEditMode($event)">
    <div class="AssetEditorPropBlock-row">
      <span
        class="AssetEditorPropBlock-typeCircle field-type-dot"
        :class="[typeCircleClass, { 'is-clickable': canOpenSettings }]"
        :title="canOpenSettings ? $t('assetEditor.changeSettings') : undefined"
        @click.stop="openSettings"
      ></span>
      <div class="AssetEditorPropBlock-title">
        <renamable-text
          class="AssetEditorPropBlock-title-value"
          :value="title"
          :disabled="!canRename"
          :validate-value="validateRenameValue"
          @change="changeTitle"
        >
          <caption-string :value="title" />
        </renamable-text>
      </div>
      <prop-field-value
        v-if="!field.multiple"
        ref="value"
        class="AssetEditorPropBlock-value"
        :edit-mode="valueEditMode"
        :model-value="currentValue"
        :same-value="sameValue"
        :computed-state="computedState"
        :field="field"
        :form-state="formState"
        :display-mode="displayMode"
        @update:model-value="changeValue($event)"
        @enter="save()"
        @change-props="changeBlockProps($event)"
      ></prop-field-value>
      <prop-field-value-stack
        v-else
        ref="value"
        class="AssetEditorPropBlock-value"
        :edit-mode="valueEditMode"
        :field="field"
        :form-state="formState"
        :display-mode="displayMode"
        @enter="save()"
        @change-props="changeBlockProps($event)"
      ></prop-field-value-stack>
    </div>
    <right-panel v-if="changeSettingsOpen">
      <prop-block-change-settings
        class="AssetEditorPropBlock-changeSettings"
        :form-state="formState"
        :asset-changer="assetChanger"
        :resolved-block="resolvedBlock"
        @save="save()"
        @rename-prop="changeTitle($event)"
        @change-service-name="changeServiceName"
      ></prop-block-change-settings>
    </right-panel>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import {
  castAssetPropValueToBoolean,
  castAssetPropValueToString,
  extractSubObjectAsPlainValue,
  makeBlockRef,
  normalizeAssetPropPart,
  sameAssetPropValues,
  type AssetProps,
  type AssetPropValue,
  type AssetPropsPlainObjectValue,
} from '#logic/types/Props';
import type { PropsFormFieldDef, PropsFormState } from '#logic/types/PropsForm';
import PropFieldValue from '#components/Props/PropFieldValue.vue';
import PropFieldValueStack from '#components/Props/PropFieldValueStack.vue';
import { getFieldTypeDotClass } from '#components/Props/fieldTypeDot';
import PropBlockChangeSettings from './PropBlockChangeSettings.vue';
import { extractPropsFormState } from '../PropsBlock/PropsBlock';
import { AssetRights, MIN_ASSET_RIGHTS_TO_CHANGE } from '#logic/types/Rights';
import type { AssetBlockEditorVM } from '#logic/vm/AssetBlockEditorVM';
import type { AssetDisplayMode, ResolvedAssetBlock } from '#logic/utils/assets';
import type { AssetChanger } from '#logic/types/AssetChanger';
import RightPanel from '#components/Common/RightPanel.vue';
import RenamableText from '#components/Common/RenamableText.vue';
import CaptionString from '#components/Common/CaptionString.vue';
import {
  type SetClickOutsideCancel,
  setImsClickOutside,
} from '#components/utils/ui';
import { isElementInteractive } from '#components/utils/DomElementUtils';
import DialogManager from '#logic/managers/DialogManager';
import AssetServiceNameDialog from '#components/Asset/AssetServiceNameDialog.vue';
import UiManager from '#logic/managers/UiManager';
import EditorManager from '#logic/managers/EditorManager';
import { BLOCK_NAME_META } from '#logic/constants';
import type { AssetFullInstanceR } from '#logic/types/AssetFullInstance';

export default defineComponent({
  name: 'PropBlock',
  components: {
    PropFieldValue,
    PropFieldValueStack,
    PropBlockChangeSettings,
    RightPanel,
    RenamableText,
    CaptionString,
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
      settingsClickOutside: null as SetClickOutsideCancel | null,
      changeSettingsOpen: false,
    };
  },
  computed: {
    isReadOnly() {
      return this.readonly || this.rights < MIN_ASSET_RIGHTS_TO_CHANGE;
    },
    canRename() {
      return this.rights === AssetRights.FULL_ACCESS;
    },
    canOpenSettings(): boolean {
      return (
        this.displayMode === 'normal' && this.rights === AssetRights.FULL_ACCESS
      );
    },
    title(): string {
      return this.resolvedBlock.title ?? this.resolvedBlock.name ?? '';
    },
    typeCircleClass(): string {
      return getFieldTypeDotClass(
        this.resolvedBlock.props?.__type
          ? castAssetPropValueToString(this.resolvedBlock.props.__type)
          : null,
      );
    },
    formState(): PropsFormState {
      return extractPropsFormState(this.resolvedBlock);
    },
    fieldType(): string {
      const type = this.resolvedBlock.props?.__type;
      return type ? castAssetPropValueToString(type) : 'text';
    },
    fieldParams(): AssetProps {
      const params = extractSubObjectAsPlainValue(
        this.resolvedBlock.props ?? {},
        '__params',
      ) as AssetPropsPlainObjectValue | null;
      return params && typeof params === 'object' && !Array.isArray(params)
        ? (params as AssetProps)
        : {};
    },
    fieldHint(): string | null {
      const hint = this.resolvedBlock.props?.__hint;
      return hint ? castAssetPropValueToString(hint) : null;
    },
    field(): PropsFormFieldDef {
      return {
        index: 0,
        propKey: 'value',
        propTitle:
          this.resolvedBlock.title ?? this.resolvedBlock.name ?? 'Variable',
        propName: this.resolvedBlock.name ?? undefined,
        type: this.fieldType,
        multiple: castAssetPropValueToBoolean(
          this.resolvedBlock.props?.__multiple ?? false,
        ),
        params: this.fieldParams,
        differentDefinition: false,
        hint: this.fieldHint,
      };
    },
    valueEditMode() {
      return !this.isReadOnly && this.displayMode === 'normal';
    },
    currentValue(): AssetPropValue {
      const ent = this.formState.values['value'];
      if (!ent) return null;
      return this.valueEditMode ? ent.value : ent.computedValue;
    },
    sameValue() {
      const ent = this.formState.values['value'];
      if (!ent) return true;
      return this.valueEditMode ? ent.same : ent.computedSame;
    },
    computedState() {
      const ent = this.formState.values['value'];
      if (this.valueEditMode) return true;
      return ent ? ent.computedState : true;
    },
  },
  watch: {
    changeSettingsOpen() {
      if (this.changeSettingsOpen) {
        this.resetGlobalClickOutside(false);
        this.cancelSettingsClickOutside();
        this.settingsClickOutside = setImsClickOutside(this.$el, () => {
          this.changeSettingsOpen = false;
        });
      } else {
        this.cancelSettingsClickOutside();
      }
    },
  },
  unmounted() {
    this.resetGlobalClickOutside(false);
    this.cancelSettingsClickOutside();
  },
  methods: {
    changeTitle(title: string) {
      const error = this.validateRenameValue(title);
      if (error) {
        this.$getAppManager().get(UiManager).showError(error);
        return;
      }
      const new_title = title.trim() ? title.trim() : null;
      const by_title_key =
        !this.resolvedBlock.name ||
        normalizeAssetPropPart(this.title) === this.resolvedBlock.name;
      const changes: { title?: string | null; name?: string | null } = {
        title: new_title,
      };
      if (by_title_key && new_title) {
        const new_name = normalizeAssetPropPart(new_title);
        if (new_name !== this.resolvedBlock.name) {
          changes.name = new_name;
        }
      }
      this.assetChanger.changeBlockParams(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        changes,
      );
    },
    async changeServiceName() {
      const new_name_raw = await this.$getAppManager()
        .get(DialogManager)
        .show(AssetServiceNameDialog, {
          header: this.$t('assetEditor.blockMenu.setServiceName'),
          yesCaption: this.$t('common.dialogs.rename'),
          value: this.resolvedBlock.name ?? this.title,
          validate: (val: string) => {
            const err = this.validateNewServiceName(val);
            if (err) {
              throw new Error(err);
            }
            return val;
          },
        });
      if (new_name_raw === undefined || new_name_raw === null) return;
      const new_name =
        typeof new_name_raw === 'string' ? new_name_raw.trim() : null;
      await this.assetBlockEditor.changeBlockServiceName(
        this.resolvedBlock,
        new_name ? new_name : null,
      );
    },
    changeValue(val: AssetPropValue) {
      if (
        sameAssetPropValues(this.formState.values['value']?.value ?? null, val)
      ) {
        return;
      }
      this.assetChanger.setBlockPropKey(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        'value',
        val,
      );
    },
    changeBlockProps(changes: AssetProps[]) {
      this.assetChanger.registerBlockPropsChanges(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        changes,
      );
    },
    save() {
      this.$emit('save');
      this.assetBlockEditor.exitEditMode();
      this.resetGlobalClickOutside(false);
      this.changeSettingsOpen = false;
    },
    openSettings() {
      if (!this.canOpenSettings) return;
      this.changeSettingsOpen = !this.changeSettingsOpen;
    },
    cancelSettingsClickOutside() {
      if (this.settingsClickOutside) {
        this.settingsClickOutside();
        this.settingsClickOutside = null;
      }
    },
    async enterEditMode(ev?: MouseEvent) {
      if (this.isReadOnly) return;
      if (ev && isElementInteractive(ev.target as HTMLElement)) return;
      this.assetBlockEditor.enterEditMode(this.resolvedBlock.id);
      this.resetGlobalClickOutside(true);
      if (!this.$refs['value']) return;
      await this.$nextTick();
      if (this.$refs['value']) {
        (this.$refs['value'] as any).focus();
      }
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
    validateNewServiceName(name: string) {
      if (name === BLOCK_NAME_META) {
        return this.$t('assetEditor.blockNameReserved');
      }
      if (this.resolvedBlock.name === name) {
        return null;
      }
      const exists_block = this.assetBlockEditor.getBlockByName(name);
      if (exists_block && exists_block.own) {
        return this.$t('assetEditor.blockNameAlreadyInUse');
      }
      if (this.isVariableNameInUse(name)) {
        return this.$t('assetEditor.blockNameAlreadyInUse');
      }
      return null;
    },
    validateRenameValue(value: string): string | null {
      const new_title = value.trim();
      if (!new_title) return null;
      const by_title_key =
        !this.resolvedBlock.name ||
        normalizeAssetPropPart(this.title) === this.resolvedBlock.name;
      if (!by_title_key) return null;
      const new_name = normalizeAssetPropPart(new_title);
      if (!new_name || new_name === this.resolvedBlock.name) {
        return null;
      }
      return this.validateNewServiceName(new_name);
    },
    getProvidedVariableNames(): Set<string> {
      const names = new Set<string>();
      const asset = this.assetBlockEditor.assetFull;
      if (!asset) return names;
      const app_manager = this.$getAppManager();
      const editor_manager = app_manager.get(EditorManager);
      const blocks = this.assetBlockEditor.resolveBlocks().list;
      for (const block of blocks) {
        if (block.id === this.resolvedBlock.id) continue;
        const controller = editor_manager.getBlockTypesMap()[block.type];
        if (!controller) continue;
        const variables = controller.getBlockProvidedVariables(
          asset as AssetFullInstanceR,
          block,
          app_manager,
        );
        for (const variable of variables) {
          if (variable.name) names.add(variable.name);
        }
      }
      return names;
    },
    isVariableNameInUse(name: string): boolean {
      return this.getProvidedVariableNames().has(name);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/field-type-dot' as *;

.AssetEditorPropBlock {
  position: relative;
  min-height: 28px;

  &.state-edit {
    border-color: var(--color-main-yellow);
  }
}

.AssetEditorPropBlock-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.AssetEditorPropBlock-title {
  flex: 0 0 190px;
  min-width: 0;
}

.AssetEditorPropBlock-title-value {
  flex: 1;
  min-width: 0;
  font-weight: 500;
  font-size: var(--local-font-size);
  overflow: hidden;
  padding: 3px 7px;
  margin-left: -7px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: text;
  transition: background 0.15s ease;

  &:not(.RenamableText-editor):hover {
    background: var(--local-hl-bg-color);
  }

  :deep(.RenamableText-static) {
    overflow: hidden;
    white-space: nowrap;
  }

  :deep(.CaptionString) {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :deep(.RenamableText-editor) {
    padding: 2px 6px;
    border: 1px solid var(--color-accent);
    border-radius: 6px;
    background: transparent;
  }
}

.AssetEditorPropBlock-value {
  flex: 1 1 auto;
  min-width: 80px;
  margin-left: auto;
  margin-right: 4px;

  :deep(.PropFieldValue-main) {
    display: flex;
    align-items: center;
  }

  :deep(.PropFieldValueStack-item-value) {
    display: flex;
    align-items: center;
  }
}

.AssetEditorPropBlock-typeCircle {
  &.is-clickable {
    cursor: pointer;
  }
}

.AssetEditorPropBlock-changeSettings {
  height: 100%;
}
</style>

<style lang="scss">
.EditorBlock[block-type='prop'] {
  .EditorBlock-leftControls,
  .EditorBlock-rightControls {
    top: 3px;
  }
}
</style>

<template>
  <div class="ChecklistBlock" @click="enterEditMode($event)">
    <div class="ChecklistBlock-content">
      <checklist-block-item
        v-for="entry of entries.list"
        :ref="(el) => setEntryRef(entry, el)"
        :key="entry.key"
        class="ChecklistBlock-item"
        :readonly="readonly"
        :entry="entry"
        :edit-mode="editMode"
        :asset-block-editor="assetBlockEditor"
        :validate-checklist-item-name="
          (val) => validateChecklistItemName(entry, val)
        "
        :drag-props="{
          isDragAllowed: editMode,
          dragOn,
          dragWhat,
        }"
        :vm="checklistVm"
        :resolved-block="resolvedBlock"
        @rename="renameEntry(entry, $event)"
        @check="checkEntry(entry, $event)"
        @pre-enter="onItemEnter(entry)"
        @dragover="dragOver($event, entry)"
        @dragleave.prevent="dragLeave($event)"
        @drop="dragChecklistItemDrop($event, entry)"
        @blur="resetGlobalClickOutside(false)"
      >
        <template #checklist-item-append="props">
          <slot name="checklist-item-append" v-bind="props"></slot>
        </template>
      </checklist-block-item>
    </div>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent, type UnwrapRef } from 'vue';
import type { ResolvedAssetBlock } from '#logic/utils/assets';
import ChecklistBlockItem from './ChecklistBlockItem.vue';
import {
  type AssetPropValue,
  type AssetPropValueAsset,
  castAssetPropValueToString,
  isFilledAssetPropValue,
  makeBlockRef,
} from '#logic/types/Props';
import UiManager from '#logic/managers/UiManager';
import type { AssetBlockEditorVM } from '#logic/vm/AssetBlockEditorVM';
import type { EditorBlockHandler } from '#components/Asset/Editor/EditorBlock';
import {
  getClosestNodeByClass,
  isElementInteractive,
} from '#components/utils/DomElementUtils';
import {
  getBetweenIndexWithTimestamp,
  getPreviousIndexWithTimestamp,
} from '#components/Asset/Editor/blockUtils';
import type {
  ChecklistBlockExtractedEntries,
  ChecklistBlockItemObject,
} from './ChecklistBlock';
import { v4 as uuidv4 } from 'uuid';
import { md5 } from 'hash-wasm';
import type { AssetChanger } from '#logic/types/AssetChanger';
import {
  setImsClickOutside,
  type SetClickOutsideCancel,
} from '#components/utils/ui';
import ChecklistBlockVM from './ChecklistBlockVM';

export default defineComponent({
  name: 'ChecklistBlock',
  components: {
    ChecklistBlockItem,
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
    editorBlockHandler: {
      type: Object as PropType<EditorBlockHandler>,
      required: true,
    },
    resolvedBlock: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
    externalVm: {
      type: [Object, null] as PropType<UnwrapRef<ChecklistBlockVM | null>>,
      default: null,
    },
  },
  emits: ['save', 'discard'],
  data() {
    return {
      clickOutside: null as SetClickOutsideCancel | null,
      entryRefs: new Map<string, any>(),
      dragOn: null as string | null,
      dragWhat: null as 'checklist_item' | null,
      checklistVm: this.externalVm
        ? this.externalVm
        : new ChecklistBlockVM({
            readonly: this.readonly,
            assetBlockEditor: this.assetBlockEditor,
            resolvedBlock: this.resolvedBlock,
            assetChanger: this.assetChanger,
            appManager: this.$getAppManager(),
            editorBlockHandler: this.editorBlockHandler,
          }),
    };
  },
  computed: {
    editMode() {
      return this.assetBlockEditor.isBlockEditing(this.resolvedBlock.id);
    },
    realEntries(): ChecklistBlockExtractedEntries {
      return this.checklistVm.getRealEntries(this.resolvedBlock);
    },
    entries(): ChecklistBlockExtractedEntries {
      return this.checklistVm.getEntries(this.resolvedBlock);
    },
  },
  unmounted() {
    this.resetGlobalClickOutside(false);
  },
  methods: {
    dragLeave(_: DragEvent) {
      this.dragOn = null;
      this.dragWhat = null;
    },
    async dragOver(ev: DragEvent, entry: ChecklistBlockItemObject) {
      if (this.readonly) {
        return;
      }
      if (ev.dataTransfer) {
        const checklist_item = ev.dataTransfer.types.includes('checklist_item');
        if (!checklist_item) return;
        if (ev.target) {
          this.dragWhat = 'checklist_item';
          this.dragOn = entry.key;
          ev.preventDefault();
        }
      }
    },
    async dragChecklistItemDrop(
      ev: DragEvent,
      entry: ChecklistBlockItemObject,
    ) {
      this.dragOn = null;
      this.dragWhat = null;
      if (ev.dataTransfer) {
        const checklist_item_data = ev.dataTransfer.getData('checklist_item');
        if (!checklist_item_data) {
          return;
        }
        const checklist_item_info: {
          key: string;
          title: string;
          task: AssetPropValueAsset | null;
          checked: boolean;
          checklist_block_id: string;
        } = JSON.parse(checklist_item_data);
        if (!checklist_item_info) {
          return true;
        }
        //вычисляю индекс для переносимого элемента
        let max_index = this.entries.maxIndex;
        const moved_item_index =
          checklist_item_info.checklist_block_id === this.resolvedBlock.id
            ? this.entries.list.findIndex(
                (e) => e.key === checklist_item_info.key,
              )
            : -1;
        const based_item_index = this.entries.list.findIndex(
          (e) => e.key === entry.key,
        );
        if (based_item_index > 0) {
          max_index = getBetweenIndexWithTimestamp(
            this.entries.list[based_item_index - 1].index,
            this.entries.list[based_item_index].index,
          );
        } else if (based_item_index === 0) {
          max_index = getPreviousIndexWithTimestamp(
            this.entries.list[based_item_index].index,
          );
        }
        const op_id = this.assetChanger.makeOpId();

        const new_prop_str = castAssetPropValueToString(
          checklist_item_info.title,
        );
        let prop_key =
          moved_item_index > -1
            ? checklist_item_info.key
            : new_prop_str
              ? await md5(new_prop_str)
              : '';
        const has_element_with_same_title =
          moved_item_index === -1
            ? this.entries.list.find(
                (e) => e.title === checklist_item_info.title,
              )
            : null;
        if (has_element_with_same_title) {
          prop_key = uuidv4();
        }
        this.assetChanger.setBlockPropKeys(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          {
            [prop_key + '\\index']: max_index,
            [prop_key + '\\checked']: checklist_item_info.checked,
            [prop_key + '\\title']: checklist_item_info.title,
            ...(checklist_item_info.task
              ? {
                  [prop_key + '\\task']: {
                    ...checklist_item_info.task,
                  },
                }
              : {}),
          },
          op_id,
        );
        //удаляю элемент из списка, откуда переносится задача
        if (checklist_item_info.checklist_block_id !== this.resolvedBlock.id) {
          this.assetChanger.deleteBlockPropKey(
            this.resolvedBlock.assetId,
            makeBlockRef(null, checklist_item_info.checklist_block_id),
            null,
            `${checklist_item_info.key}`,
          );
          await this.save();
        }
      }
    },
    async renameEntry(entry: ChecklistBlockItemObject, val: AssetPropValue) {
      const error = this.validateChecklistItemName(entry, val);
      if (error) {
        this.$getAppManager().get(UiManager).showError(error);
        return;
      }
      const new_prop_str = castAssetPropValueToString(val);
      let prop_key = new_prop_str ? await md5(new_prop_str) : '';

      const op_id = this.assetChanger.makeOpId();

      if (prop_key === entry.key) {
        this.assetChanger.setBlockPropKey(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          `${entry.key}\\title`,
          val,
          op_id,
        );
        return;
      } else if (!prop_key || this.realEntries.map.hasOwnProperty(prop_key)) {
        prop_key = uuidv4();
      }

      if (this.realEntries.map.hasOwnProperty(entry.key)) {
        if (isFilledAssetPropValue(val)) {
          this.assetChanger.renameBlockPropKey(
            this.resolvedBlock.assetId,
            makeBlockRef(this.resolvedBlock),
            null,
            entry.key,
            prop_key,
            op_id,
          );
          this.assetChanger.setBlockPropKey(
            this.resolvedBlock.assetId,
            makeBlockRef(this.resolvedBlock),
            null,
            `${prop_key}\\title`,
            val,
            op_id,
          );
        } else {
          this.assetChanger.deleteBlockPropKey(
            this.resolvedBlock.assetId,
            makeBlockRef(this.resolvedBlock),
            null,
            entry.key,
            op_id,
          );
        }
      } else {
        if (isFilledAssetPropValue(val)) {
          this.assetChanger.setBlockPropKeys(
            this.resolvedBlock.assetId,
            makeBlockRef(this.resolvedBlock),
            null,
            {
              [`${prop_key}\\index`]: entry.index,
              [`${prop_key}\\title`]: val,
            },
          );
        }
      }
    },
    async checkEntry(entry: ChecklistBlockItemObject, new_completed: boolean) {
      await this.checklistVm.checkEntry(entry, new_completed);
      this.save();
    },
    async deleteChecklistItemByKey(entry_key: string) {
      this.checklistVm.deleteEntryByKey(entry_key);
      await this.save();
    },
    async save() {
      await this.checklistVm.save();
      this.resetGlobalClickOutside(false);
    },
    async enterEditMode(ev?: MouseEvent) {
      if (this.readonly) return;
      if (this.editMode) return;
      if (ev && isElementInteractive(ev.target as HTMLElement)) return;
      this.assetBlockEditor.enterEditMode(this.resolvedBlock.id);
      this.resetGlobalClickOutside(true);
      if (ev) {
        const closest = getClosestNodeByClass(
          ev.target as Node,
          'ChecklistBlock-item',
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
      } else {
        const first_entry_ref =
          this.entries.list.length > 0
            ? this.entryRefs.get(this.entries.list[0].key)
            : undefined;
        if (!first_entry_ref) return;
        first_entry_ref.focus();
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
    validateChecklistItemName(
      _entry: ChecklistBlockItemObject,
      _val: AssetPropValue,
    ) {
      return null;
    },
    async onItemEnter(entry: ChecklistBlockItemObject) {
      let index = this.entries.list.indexOf(entry);
      const next_key = this.entries.list[index + 1]?.key;
      await new Promise((res) => setTimeout(res, 10));
      const cur = this.entries.list[index];
      const cur_key = this.entries.list[index]?.key;
      let was_deleted = false;
      if (next_key === cur_key) {
        // Значение из списка было удалено
        index--;
        was_deleted = true;
      }
      let next = this.entries.list[index + 1];
      if (next) {
        const next_title = castAssetPropValueToString(next.title);
        const cur_title = castAssetPropValueToString(cur.title);
        if (!was_deleted && cur && next_title === '') {
          const match = cur_title.match(/^((\d+\.)*)(\d+)([.)])([\t ]+)/);
          if (match) {
            const next_val = (parseInt(match[3]) + 1).toString();
            const insert =
              match[1] +
              next_val +
              match[4] +
              (match[5].length > 1 && next_val.length > match[3].length
                ? match[5].substring(1)
                : match[5]);
            const error = this.validateChecklistItemName(next, insert);
            if (!error) {
              await this.renameEntry(next, insert);
              await this.$nextTick();
              next = this.entries.list[index + 1];
            }
          }
        }
        this.focusEntry(next);
      }
    },
    focusEntry(entry: ChecklistBlockItemObject) {
      const entry_el = this.entryRefs.get(entry.key);
      if (!entry_el) return;
      entry_el.focusEnd();
    },
    setEntryRef(entry: ChecklistBlockItemObject, el: any) {
      if (!el) this.entryRefs.delete(entry.key);
      else this.entryRefs.set(entry.key, el);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.ChecklistBlock {
  padding: 5px 0px;
  background-color: var(--local-bg-color);

  &.state-edit {
    border-color: var(--color-main-yellow);
  }

  &:not(.state-edit) {
    cursor: text;
  }
}

.ChecklistBlock-newItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 15px 7px 20px;
  gap: 24px;
}

.ChecklistBlock-newItem-addButton {
  min-width: 130px;
}
</style>

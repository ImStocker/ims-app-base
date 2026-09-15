<template>
  <div
    class="AssetListBlock"
    :class="{ 'AssetListBlock-drop': allowDrop }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <sortable-list
      class="AssetListBlock-list"
      :id-key="entryIdKey"
      :list="entries"
      :disabled="!editable"
      @update:list="changeOrder"
    >
      <template #default="{ item }">
        <div
          class="AssetListBlock-slot"
          :title="entryTitle(item)"
          @click="openAssetInPopup(item)"
        >
          <div class="AssetListBlock-slot-icon">
            <asset-icon
              class="AssetListBlock-slot-icon-image"
              :asset="assetLinkFor(item)"
            ></asset-icon>
          </div>
          <div class="AssetListBlock-slot-title" :style="titleStyle(item)">
            <caption-string
              :value="item.asset?.Title ?? item.asset?.Name ?? ''"
            />
          </div>
          <button
            v-if="editable"
            class="is-button is-button-icon AssetListBlock-slot-remove"
            :title="$t('assetEditor.assetListBlockRemoveAsset')"
            @click.stop="removeEntry(item)"
          >
            <i class="ri-close-fill"></i>
          </button>
        </div>
      </template>
      <template #append>
        <div
          v-if="editable"
          class="AssetListBlock-slot AssetListBlock-slot-add"
          :title="$t('assetEditor.assetListBlockAddAsset')"
          @click="openSelectAssetDialog()"
        >
          <div class="AssetListBlock-slot-icon">
            <i class="ri-add-line AssetListBlock-slot-icon-image"></i>
          </div>
        </div>
      </template>
    </sortable-list>
    <right-panel v-if="changeSettingsOpen">
      <asset-list-block-change-settings
        class="AssetListBlock-settings"
        :asset-changer="assetChanger"
        :resolved-block="resolvedBlock"
        @save="closeChangeSettings()"
      ></asset-list-block-change-settings>
    </right-panel>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import {
  makeBlockRef,
  type AssetProps,
  type AssetPropValueAsset,
  type AssetPropValueSelection,
} from '#logic/types/Props';
import {
  AssetPropWhereOpKind,
  type AssetPropWhere,
} from '#logic/types/PropsWhere';
import DialogManager from '#logic/managers/DialogManager';
import CreatorAssetManager from '#logic/managers/CreatorAssetManager';
import UiManager from '#logic/managers/UiManager';
import EditorManager from '#logic/managers/EditorManager';
import type {
  AssetForSelection,
  AssetLink,
  AssetShort,
} from '#logic/types/AssetsType';
import SelectAssetDialog from '#components/Asset/SelectAssetDialog.vue';
import type { AssetChanger } from '#logic/types/AssetChanger';
import type { AssetDisplayMode, ResolvedAssetBlock } from '#logic/utils/assets';
import type { AssetBlockEditorVM } from '#logic/vm/AssetBlockEditorVM';
import type { AssetRights } from '#logic/types/Rights';
import { MIN_ASSET_RIGHTS_TO_CHANGE } from '#logic/types/Rights';
import RightPanel from '#components/Common/RightPanel.vue';
import CaptionString from '#components/Common/CaptionString.vue';
import type { EditorBlockHandler } from '#components/Asset/Editor/EditorBlock';
import AssetIcon from '#components/Asset/AssetIcon.vue';
import { nodeContainsElement } from '#components/utils/DomElementUtils';
import SortableList from '#components/Common/SortableList.vue';
import { resolveAssetIconColor } from '#logic/utils/assetIconColors';
import AssetListBlockChangeSettings from './AssetListBlockChangeSettings.vue';

type AssetListEntry = {
  key: string;
  index: number;
  icon: string | null;
  asset: AssetPropValueAsset | null;
};

export default defineComponent({
  name: 'AssetListBlock',
  components: {
    RightPanel,
    CaptionString,
    AssetIcon,
    SortableList,
    AssetListBlockChangeSettings,
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
    editorBlockHandler: {
      type: Object as PropType<EditorBlockHandler>,
      default: null,
    },
    requestToolbarTarget: {
      type: Function as PropType<() => Promise<HTMLElement | null>>,
      default: null,
    },
    blockController: {
      type: Object as PropType<unknown>,
      default: null,
    },
  },
  emits: ['save'],
  data() {
    return {
      changeSettingsOpen: false,
      allowDrop: false,
      entriesColors: {} as Record<string, string | null>,
    };
  },
  computed: {
    isReadOnly(): boolean {
      return this.readonly || this.rights < MIN_ASSET_RIGHTS_TO_CHANGE;
    },
    editable(): boolean {
      return !this.isReadOnly && this.displayMode === 'normal';
    },
    typeValue(): AssetPropValueAsset | null {
      const val = this.resolvedBlock.computed?.['__type'] as
        | AssetPropValueAsset
        | null
        | undefined;
      return val && typeof val === 'object' && (val as any).AssetId
        ? val
        : null;
    },
    conditionValue(): AssetPropValueSelection | null {
      const val = this.resolvedBlock.computed?.['__condition'] as
        | AssetPropValueSelection
        | null
        | undefined;
      return val && typeof val === 'object' ? val : null;
    },
    where(): AssetPropWhere {
      const where: AssetPropWhere = {
        inside: 'gdd',
      };
      if (this.typeValue?.AssetId) {
        where.typeids = this.typeValue.AssetId;
      }
      const condition_where = this.conditionValue?.Where;
      if (condition_where) {
        return {
          ...where,
          search: {
            op: AssetPropWhereOpKind.AND,
            v: [condition_where],
          },
        };
      }
      return where;
    },
    entries(): AssetListEntry[] {
      const res: AssetListEntry[] = [];
      const index_regexp = /^value\\(-?\d+)$/;
      for (const [key, val] of Object.entries(
        this.resolvedBlock.computed ?? {},
      )) {
        const match = key.match(index_regexp);
        if (!match) continue;
        if (match[0] !== key && key[match[0].length] !== '\\') continue;
        const value = val as AssetPropValueAsset | null;
        res.push({
          key,
          index: parseInt(match[1], 10),
          icon:
            value && typeof value === 'object' && (value as any).Icon
              ? (value as any).Icon
              : null,
          asset: value && typeof value === 'object' ? value : null,
        });
      }
      res.sort((a, b) => a.index - b.index);
      return res;
    },
  },
  methods: {
    assetLinkFor(entry: AssetListEntry): AssetLink {
      return {
        id: entry.asset?.AssetId ?? entry.key,
        icon: entry.icon ?? undefined,
      };
    },
    entryTitle(entry: AssetListEntry): string {
      return entry.asset?.Name ?? entry.asset?.Title ?? entry.key;
    },
    entryIdKey(entry: AssetListEntry): string {
      return entry.asset?.AssetId ?? entry.key;
    },
    openAssetInPopup(entry: AssetListEntry) {
      const asset_id = entry.asset?.AssetId;
      if (!asset_id) return;
      this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          this.$getAppManager().get(EditorManager).openAsset(asset_id, 'popup');
        });
    },
    entryTitleColor(entry: AssetListEntry): string | null {
      const asset_id = entry.asset?.AssetId;
      if (!asset_id) return null;
      if (asset_id in this.entriesColors) {
        return this.entriesColors[asset_id];
      }
      const cached = this.$getAppManager()
        .get(CreatorAssetManager)
        .getAssetPreviewViaCacheSync(asset_id);
      const theme = this.$getAppManager().get(UiManager).getColorTheme();
      if (cached) {
        const color = resolveAssetIconColor(cached.color, theme);
        this.entriesColors[asset_id] = color;
        return color;
      }
      if (cached === undefined) {
        this.$getAppManager()
          .get(CreatorAssetManager)
          .requestAssetPreviewInCache(asset_id)
          .then(() => {
            const preview = this.$getAppManager()
              .get(CreatorAssetManager)
              .getAssetPreviewViaCacheSync(asset_id);
            this.entriesColors[asset_id] = preview
              ? resolveAssetIconColor(preview.color, theme)
              : null;
          });
      }
      return null;
    },
    titleStyle(entry: AssetListEntry): { color: string } | null {
      const color = this.entryTitleColor(entry);
      return color ? { color } : null;
    },
    async save() {
      if (this.editorBlockHandler) {
        await this.editorBlockHandler.save();
      }
      this.$emit('save');
    },
    removeEntry(entry: AssetListEntry) {
      const op_id = this.assetChanger.makeOpId();
      const keys_to_delete = [entry.key];
      const props_to_set: AssetProps = {};
      for (const e of this.entries) {
        if (e.index > entry.index) {
          keys_to_delete.push(e.key);
          props_to_set[`value\\${e.index - 1}`] = e.asset;
        }
      }
      this.assetChanger.deleteBlockPropKeys(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        keys_to_delete,
        op_id,
      );
      if (Object.keys(props_to_set).length > 0) {
        this.assetChanger.setBlockPropKeys(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          props_to_set,
          op_id,
        );
      }
      this.save();
    },
    makeAssetPropValue(asset: AssetForSelection): AssetPropValueAsset {
      return {
        AssetId: asset.id,
        Title: asset.title,
        Name: asset.name,
      };
    },
    async openSelectAssetDialog(replaceIndex?: number) {
      const dialogManager = this.$getAppManager().get(DialogManager);
      const asset = await dialogManager.show(SelectAssetDialog, {
        where: this.where,
        dialogHeader: this.$t('assetEditor.assetListBlockSelectAsset'),
      });
      if (!asset) return;
      await this.commitAsset(asset, replaceIndex);
    },
    async commitAsset(asset: AssetForSelection, replaceIndex?: number) {
      const value = this.makeAssetPropValue(asset);
      if (replaceIndex !== undefined) {
        this.assetChanger.setBlockPropKey(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          `value\\${replaceIndex}`,
          value,
        );
      } else {
        const max_index =
          this.entries.length > 0
            ? this.entries[this.entries.length - 1].index
            : -1;
        this.assetChanger.setBlockPropKey(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          `value\\${max_index + 1}`,
          value,
        );
      }
      this.save();
    },
    async addDroppedAsset(asset_short: AssetShort) {
      await this.commitAsset({
        id: asset_short.id,
        icon: asset_short.icon,
        name: asset_short.name,
        title: asset_short.title,
      });
    },
    changeOrder(reordered: AssetListEntry[]) {
      const props_to_set: AssetProps = {};
      for (let i = 0; i < reordered.length; i++) {
        props_to_set[`value\\${i}`] = reordered[i].asset;
      }
      this.assetChanger.setBlockPropKeys(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        props_to_set,
        this.assetChanger.makeOpId(),
      );
      this.save();
    },
    onDragOver(event: DragEvent) {
      const event_dt = event.dataTransfer;
      if (!event_dt) return;
      const drag_is_asset = event_dt.types.includes('asset');
      if (!drag_is_asset) return;
      this.allowDrop = true;
      event_dt.dropEffect = 'link';
      event.preventDefault();
    },
    onDragLeave(event: DragEvent) {
      if (!nodeContainsElement(this.$el, event.relatedTarget as Node)) {
        this.allowDrop = false;
      }
    },
    async onDrop(event: DragEvent) {
      event.preventDefault();
      this.allowDrop = false;
      const event_dt = event.dataTransfer;
      if (!event_dt) return;
      const event_dt_asset = event_dt.getData('asset');
      if (!event_dt_asset) return;
      event.stopPropagation();
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          const event_dt_asset_parsed = JSON.parse(event_dt_asset) as {
            id: string;
          };
          if (!event_dt_asset_parsed.id) return;
          const drop_asset_short = await this.$getAppManager()
            .get(CreatorAssetManager)
            .getAssetShortViaCache(event_dt_asset_parsed.id);
          if (!drop_asset_short) {
            throw new Error(this.$t('asset.assetNotFound'));
          }
          const match = this.where
            ? await this.$getAppManager()
                .get(CreatorAssetManager)
                .matchAssetShortsWithWhere([drop_asset_short], this.where)
            : [drop_asset_short];
          if (match.length === 0) {
            throw new Error(this.$t('asset.assetIsNotMatched'));
          }
          await this.addDroppedAsset(drop_asset_short);
        });
    },
    openSettings() {
      this.changeSettingsOpen = true;
    },
    async closeChangeSettings() {
      this.changeSettingsOpen = false;
      await this.save();
    },
  },
});
</script>

<style lang="scss" scoped>
.AssetListBlock {
  min-height: 48px;
  position: relative;
}
.AssetListBlock-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.AssetListBlock-drop {
  .AssetListBlock-slot-add {
    border-color: var(--color-accent);
    opacity: 1;
  }
}
.AssetListBlock-slot {
  position: relative;
  width: 96px;
  height: 108px;
  border: 1px solid var(--local-border-color, rgba(0, 0, 0, 0.15));
  border-radius: 8px;
  background: var(--local-bg-color, rgba(0, 0, 0, 0.03));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  cursor: pointer;
  transition: box-shadow 0.15s ease;
  &:hover {
    box-shadow: 0 0 0 2px var(--color-accent);
  }
}
.AssetListBlock-slot-add {
  border-style: dashed;
  opacity: 0.75;
  &:hover {
    opacity: 1;
  }
}
.AssetListBlock-slot-remove {
  position: absolute;
  top: 0;
  right: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: var(--local-sub-text-color);
  display: none;
  align-items: center;
  justify-content: center;
  &:hover {
    display: flex;
  }
}
.AssetListBlock-slot:hover {
  .AssetListBlock-slot-remove {
    display: flex;
  }
}
.AssetListBlock-slot-icon {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.06);
}
.AssetListBlock-slot-icon-image {
  width: 40px;
  height: 40px;
  --asset-icon-size: 40px;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.AssetListBlock-slot-title {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--local-text-color);
}
</style>

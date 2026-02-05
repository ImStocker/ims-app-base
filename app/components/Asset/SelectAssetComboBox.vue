<template>
  <div
    class="SelectAssetComboBox"
    :class="allowDrop ? 'state-allow-drop' : ''"
    @dragover="onDragOver"
    @drop="onDrop"
    @dragleave.prevent="allowDrop = false"
  >
    <menu-button
      v-model:shown="dropdownShown"
      class="SelectAssetComboBox-menu"
      @show="dropdownShownHandler()"
    >
      <template #button="{ toggle }">
        <button
          ref="button"
          class="is-input SelectAssetComboBox-menu-button ref-selectedValue"
          :class="{ focus: dropdownShown }"
          :disabled="readonly"
          @click="readonly ? null : toggle()"
        >
          <div class="SelectAssetComboBox-menu-label">
            <asset-icon
              v-if="modelValueComp"
              :asset="modelValueComp"
            ></asset-icon>
            <caption-string
              class="SelectAssetComboBox-menu-parentTitle"
              :value="modelValueComp?.title ?? placeholder"
            >
            </caption-string>
          </div>
          <i
            v-if="modelValue"
            class="ri-eye-fill SelectAssetComboBox-menu-icon-show"
            :title="$t('assetEditor.valueShowElement')"
            @click.stop="showSelection"
          ></i>
          <template v-if="!readonly">
            <i
              v-if="modelValue && clearable"
              class="asset-icon-close-line SelectAssetComboBox-menu-icon-clear"
              :title="$t('assetEditor.valueClear')"
              @click.stop="clear"
            ></i>
            <i
              v-else
              class="ri-arrow-down-s-line SelectAssetComboBox-menu-icon"
              :class="{ 'state-open': dropdownShown }"
            ></i>
          </template>
        </button>
      </template>
      <select-asset-list-box
        ref="selectAssetComboBox"
        :model-value="modelValue"
        :readonly="readonly"
        :additional-options="additionalOptions"
        :where="where"
        :has-create-new-option="hasCreateNewOption"
        class="is-dropdown SelectAssetComboBox-dropdown"
        @update:model-value="onSelected($event)"
      >
        <template v-if="hasCreateNewOption" #append>
          <button
            class="is-button is-button-dropdown-item SelectAssetComboBox-create-new-button"
            @click="openFastCreate"
          >
            <i class="ri-add-line"></i>
            {{
              addButtonTitle !== null
                ? addButtonTitle
                : creatingType
                  ? $t('sourcePage.elements.createX', {
                      x: creatingTypeTranslatedTitle,
                    })
                  : $t('sourcePage.elements.create')
            }}
          </button>
        </template>
      </select-asset-list-box>
    </menu-button>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import CaptionString from '../Common/CaptionString.vue';
import MenuButton from '../Common/MenuButton.vue';
import SelectAssetListBox from './SelectAssetListBox.vue';
import UiManager from '../../logic/managers/UiManager';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import type { AssetPropWhere } from '../../logic/types/PropsWhere';
import type {
  AssetForSelection,
  AssetShort,
} from '../../logic/types/AssetsType';
import DialogManager from '../../logic/managers/DialogManager';
import { convertTranslatedTitle } from '../../logic/utils/assets';
import AssetIcon from './AssetIcon.vue';

export default defineComponent({
  name: 'SelectAssetComboBox',
  components: {
    CaptionString,
    MenuButton,
    SelectAssetListBox,
    AssetIcon,
  },
  props: {
    modelValue: {
      type: Object as PropType<AssetForSelection | null>,
      required: false,
      default: null,
    },
    placeholder: {
      type: String,
      default: '',
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    additionalOptions: {
      type: Array<AssetForSelection>,
      default: () => [],
    },
    clearable: {
      type: Boolean,
      default: true,
    },
    where: {
      type: Object as PropType<AssetPropWhere | null>,
      default: null,
    },
    hasCreateNewOption: {
      type: Boolean,
      default: false,
    },
    addButtonTitle: {
      type: [String, null],
      default: null,
    },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      dropdownShown: false,
      allowDrop: false,
      listIsClosable: true,
      listIsHidden: false,
    };
  },
  computed: {
    rootWorkspaceId(): string | null {
      if (this.where) {
        for (const field of ['workspaceid', 'workspaceids']) {
          if (typeof this.where[field] === 'string') {
            return this.where[field];
          } else if (
            Array.isArray(this.where[field]) &&
            this.where[field].length === 1 &&
            typeof this.where[field][0] === 'string'
          ) {
            return this.where[field][0];
          }
        }
      }
      return null;
    },
    modelValueComp(): AssetForSelection | null {
      if (!this.modelValue) {
        return null;
      }
      const asset = this.$getAppManager()
        .get(CreatorAssetManager)
        .getAssetShortViaCacheSync(this.modelValue.id);
      if (asset) {
        return {
          id: asset.id,
          icon: asset.icon,
          name: asset.name,
          title: asset.title,
        };
      } else {
        return this.modelValue;
      }
    },
    currentIcon() {
      if (this.modelValue && this.modelValue.icon) {
        return this.modelValue.icon;
      }
      return this.modelValue ? 'file-fill' : null;
    },
    dialogManager() {
      return this.$getAppManager().get(DialogManager);
    },
    creatingType(): AssetShort | null {
      if (!this.creatingTypeId) {
        return null;
      }
      const type = this.$getAppManager()
        .get(CreatorAssetManager)
        .getAssetShortViaCacheSync(this.creatingTypeId);
      return type ?? null;
    },
    creatingTypeTranslatedTitle() {
      if (!this.creatingType) {
        return null;
      }
      return convertTranslatedTitle(this.creatingType.title ?? '', (...args) =>
        this.$t(...args),
      );
    },
    creatingTypeId(): string | null {
      if (!this.where) return null;
      if (!this.where.typeids) return null;
      if (typeof this.where.typeids === 'string') {
        return this.where.typeids;
      } else if (
        Array.isArray(this.where.typeids) &&
        this.where.typeids.length === 1 &&
        typeof this.where.typeids[0] === 'string'
      ) {
        return this.where.typeids[0];
      } else {
        return null;
      }
    },
  },
  watch: {
    creatingTypeId() {
      if (this.creatingTypeId) {
        this.$getAppManager()
          .get(CreatorAssetManager)
          .requestAssetShortInCache(this.creatingTypeId);
      }
    },
  },
  mounted() {
    if (this.creatingTypeId) {
      this.$getAppManager()
        .get(CreatorAssetManager)
        .requestAssetShortInCache(this.creatingTypeId);
    }
  },
  methods: {
    activate() {
      this.dropdownShown = true;
    },
    async dropdownShownHandler() {
      await new Promise((res) => setTimeout(res, 10));
      this.focusInSearch();
    },
    focusInSearch() {
      if (!this.$refs.selectAssetComboBox) return;
      (
        this.$refs.selectAssetComboBox as InstanceType<
          typeof SelectAssetListBox
        >
      ).focusInSearch();
    },
    changeValue(ev: AssetForSelection | null) {
      this.$emit('update:modelValue', ev);
    },
    onSelected(item: AssetForSelection) {
      this.changeValue(item);
      this.dropdownShown = false;
    },
    clear() {
      this.changeValue(null);
      this.dropdownShown = false;
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
          this.changeValue({
            id: drop_asset_short.id,
            icon: drop_asset_short.icon,
            name: drop_asset_short.name,
            title: drop_asset_short.title,
          });
        });
    },
    focus() {
      if (!this.$refs['button']) return;
      (this.$refs['button'] as HTMLButtonElement).focus();
    },
    async openFastCreate() {
      this.dropdownShown = false;
      const parentId = this.creatingTypeId;
      const [
        { default: AssetPreviewDialog },
        { default: FastCreateAssetDialog },
      ] = await Promise.all([
        import('./AssetPreviewDialog.vue'),
        import('./FastCreateAssetDialog.vue'),
      ]);
      const newAsset = await this.dialogManager.show(
        FastCreateAssetDialog,
        {
          set: {
            workspaceId: this.rootWorkspaceId,
            parentIds: parentId ? [parentId] : undefined,
          },
          disableChangeType: !!parentId,
        },
        this,
      );
      if (newAsset) {
        const model: AssetForSelection = {
          id: newAsset.id,
          title: newAsset.title,
          name: newAsset.name,
          icon: newAsset.icon,
        };
        this.dialogManager.show(
          AssetPreviewDialog,
          {
            assetId: newAsset.id,
          },
          this,
        );
        this.changeValue(model);
      }
    },
    async showSelection() {
      const [{ default: AssetPreviewDialog }] = await Promise.all([
        import('./AssetPreviewDialog.vue'),
      ]);
      if (!this.modelValue) {
        return;
      }

      this.dialogManager.show(
        AssetPreviewDialog,
        {
          assetId: this.modelValue.id,
        },
        this,
      );
    },
  },
});
</script>

<style lang="scss" scoped>
@use '$style/asset-icons';
@use '$style/devices-mixins.scss';

.SelectAssetComboBox {
  width: 100%;
  min-width: 100px;
}

.SelectAssetComboBox-menu-button {
  display: flex;
  width: 100%;
  gap: 5px;
}

.SelectAssetComboBox-menu-label {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 23px;
  gap: 5px;
  min-width: 0;
  white-space: nowrap;
}

.SelectAssetComboBox-menu-label-disabled {
  width: fit-content;
  max-width: 100%;
  margin-left: auto;
  display: flex;
  gap: 5px;
}
.SelectAssetComboBox-menu-parentTitle {
  text-transform: none;
  overflow: hidden;
  text-overflow: ellipsis;
}

.SelectAssetComboBox-menu-icon {
  transition: transform 0.2s;

  &.state-open {
    transform: rotate(180deg);
  }
}

.SelectAssetComboBox.state-allow-drop {
  .SelectAssetComboBox-menu-button {
    border-color: var(--input-border-hl-color);
  }
}
.SelectAssetComboBox-menu-icon-show {
  cursor: pointer;
}
.SelectAssetComboBox-menu-icon-clear {
  cursor: pointer;
  @include asset-icons.asset-icons;
}

.SelectAssetComboBox-dropdown {
  padding: var(--dropdown-padding);
  min-width: var(--DropdownContainer-attachToElement-width);
  --SelectAssetListBox-itemsHeight: 250px;
}

.SelectAssetComboBox-create-new-button {
  display: flex;
  gap: 5px;
  --button-padding: 5px 10px !important;
  --button-border-radius: 4px !important;
}
</style>

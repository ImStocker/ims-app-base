<template>
  <div
    v-if="shownOptions.length > 0"
    class="MarkdownLinkAutocomplete tiny-scrollbars"
  >
    <div
      v-if="loading"
      class="MarkdownLinkAutocomplete-loading loaderBar"
    ></div>
    <div v-if="error" class="MarkdownLinkAutocomplete-error">
      {{ error }}
    </div>
    <template v-else>
      <div
        v-for="(opt, opt_index) of shownOptions"
        :key="opt.value"
        class="MarkdownLinkAutocomplete-row"
        :class="{
          'state-selected': currentItem === opt_index,
        }"
      >
        <menu-button
          v-if="opt.type === 'asset'"
          attach-position="right"
          :shown="openedItemContents === opt_index"
          @update:shown="
            openedItemContents = $event
              ? opt_index
              : openedItemContents === opt_index
                ? -1
                : openedItemContents
          "
        >
          <template #button="{ toggle }">
            <div class="MarkdownLinkAutocomplete-row-item">
              <asset-link
                v-if="opt.type === 'asset'"
                class="MarkdownLinkAutocomplete-row-asset"
                :project="project"
                :asset="opt.raw"
                :tooltip-show-path="true"
                @mouseenter="currentItem = opt_index"
                @mousedown="selectOption(opt)"
              ></asset-link>
              <button
                class="is-button is-button-icon MarkdownLinkAutocomplete-arrowRight"
                @click="toggle"
              >
                <i class="ri-arrow-right-s-fill"></i>
              </button>
            </div>
          </template>
          <imc-editor-autocomplete-asset-contents
            class="MarkdownLinkAutocomplete-row-subitems tiny-scrollbars"
            :asset-id="opt.value"
            @select="selectOption(opt, $event)"
          ></imc-editor-autocomplete-asset-contents>
        </menu-button>
        <div
          v-else-if="opt.type === 'button'"
          class="MarkdownLinkAutocomplete-row-button"
          @mouseenter="currentItem = opt_index"
          @mousedown="selectOption(opt)"
        >
          <i
            class="MarkdownLinkAutocomplete-row-button-icon"
            :class="
              opt.value === 'search-button'
                ? 'ri-search-line'
                : 'ri-add-circle-fill'
            "
          ></i>
          <span class="MarkdownLinkAutocomplete-row-button-title">
            {{ opt.title }}
          </span>
        </div>
        <div
          v-else
          class="MarkdownLinkAutocomplete-row-other"
          :title="opt.title"
          @mouseenter="currentItem = opt_index"
          @mousedown="selectOption(opt)"
        >
          {{ opt.title }}
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import DialogManager from '../../logic/managers/DialogManager';
import SelectAssetDialog from '../Asset/SelectAssetDialog.vue';
import ProjectManager from '../../logic/managers/ProjectManager';
import FastCreateAssetDialog from '../Asset/FastCreateAssetDialog.vue';
import AssetLink from '../Asset/AssetLink.vue';
import type { ProjectInfoForLink } from '../../logic/router/routes-helpers';
import { getQueryAssetPropsSelection } from '../../logic/expression/filter/filterExpression';
import MenuButton from '../Common/MenuButton.vue';
import ImcEditorAutocompleteAssetContents from '../ImcText/ImcEditorAutocompleteAssetContents.vue';
import { convertTranslatedTitle } from '../../logic/utils/assets';
import { MARKDOWN_ASSET_ID } from '../../logic/constants';

export type MarkdownLinkOption = {
  type: 'asset' | 'button';
  value: string;
  title: string;
  raw?: any;
};

export type MarkdownLinkBlockSelection = {
  blockId?: string;
  anchor?: string;
  title?: string;
};

function isMarkdownAsset(asset: any): boolean {
  return asset?.typeIds?.includes(MARKDOWN_ASSET_ID) ?? false;
}

export default defineComponent({
  name: 'MarkdownLinkAutocomplete',
  components: {
    AssetLink,
    MenuButton,
    ImcEditorAutocompleteAssetContents,
  },
  props: {
    project: { type: Object as PropType<ProjectInfoForLink>, required: true },
    searchText: { type: String, default: '' },
    loading: { type: Boolean, default: false },
    options: { type: Array as PropType<MarkdownLinkOption[]>, required: true },
    hasMore: { type: Boolean, default: false },
    error: { type: String, default: '' },
  },
  emits: ['select'],
  data() {
    return {
      currentItem: 0,
      openedItemContents: -1,
    };
  },
  computed: {
    currentOption() {
      return this.currentItem < this.shownOptions.length
        ? this.shownOptions[this.currentItem]
        : null;
    },
    shownOptions() {
      const options: MarkdownLinkOption[] = [...this.options];
      if (this.hasMore) {
        options.push({
          type: 'button',
          value: 'search-button',
          title: this.$t('imcEditor.autocompleteMore'),
        });
      }
      const search_term = (this.searchText ?? '').trim();
      options.push({
        type: 'button',
        value: 'create-button',
        title:
          this.$t('imcEditor.autocompleteCreate') +
          (search_term ? ` "${search_term}"` : ''),
      });
      return options;
    },
  },
  watch: {
    options() {
      this.openedItemContents = -1;
    },
  },
  methods: {
    moveCursor(dy: number) {
      if (this.shownOptions.length === 0) return;
      let new_index = this.currentItem + dy;
      if (new_index < 0) new_index = 0;
      else if (new_index >= this.shownOptions.length)
        new_index = this.shownOptions.length - 1;
      this.currentItem = new_index;
    },
    openContents() {
      if (this.currentOption && this.currentOption.type === 'asset') {
        this.openedItemContents = this.currentItem;
      }
    },
    closeContents() {
      this.openedItemContents = -1;
    },
    selectCurrent() {
      if (this.shownOptions.length === 0) return;
      this.moveCursor(0);
      const option = this.shownOptions[this.currentItem];
      if (!option) return;
      this.selectOption(option);
    },
    handleKey(key: string): boolean {
      if (key === 'ArrowUp') {
        this.moveCursor(-1);
        return false;
      } else if (key === 'ArrowDown') {
        this.moveCursor(1);
        return false;
      } else if (key === 'ArrowRight') {
        this.openContents();
        return false;
      }
      return true;
    },
    async selectOption(
      option: MarkdownLinkOption,
      block?: MarkdownLinkBlockSelection,
    ) {
      await new Promise((res) => setTimeout(res, 1));

      if (option.type === 'button') {
        const gdd_workspace = this.$getAppManager()
          .get(ProjectManager)
          .getWorkspaceByName('gdd');
        if (!gdd_workspace) return;

        if (option.value === 'search-button') {
          const modal = this.$getAppManager()
            .get(DialogManager)
            .show(
              SelectAssetDialog,
              {
                searchValue: getQueryAssetPropsSelection(
                  this.searchText ? this.searchText.trim() : '',
                ),
                where: {
                  workspaceids: gdd_workspace.id,
                },
              },
              this,
            );
          const res = await modal;
          if (res) {
            this.$emit('select', {
              address: 'asset:' + res.id,
              label: res.title,
            });
          }
        } else if (option.value === 'create-button') {
          const modal = this.$getAppManager()
            .get(DialogManager)
            .show(
              FastCreateAssetDialog,
              {
                set: {
                  title: this.searchText ? this.searchText.trim() : '',
                  workspaceId: gdd_workspace.id,
                },
              },
              this,
            );
          const res = await modal;
          if (res) {
            this.$emit('select', {
              address: 'asset:' + res.id,
              label: res.title,
            });
          }
        }
        return;
      }

      const asset = option.raw;
      let address = 'asset:' + option.value;
      let label = option.title;

      if (block && block.blockId) {
        if (isMarkdownAsset(asset)) {
          address = block.anchor
            ? `asset:${option.value}#${block.anchor}`
            : `asset:${option.value}`;
        } else {
          address =
            `asset:${option.value}#bid-${block.blockId}` +
            (block.anchor ? '~' + block.anchor : '');
        }
        if (block.title) {
          label =
            option.title +
            '#' +
            convertTranslatedTitle(block.title, (key) => this.$t(key));
        }
      }

      this.$emit('select', { address, label });
    },
  },
});
</script>

<style lang="scss" scoped>
.MarkdownLinkAutocomplete {
  transform: translate(-10px, 0);
}
.MarkdownLinkAutocomplete,
.MarkdownLinkAutocomplete-row-subitems {
  max-width: 400px;
  text-align: left;
  background-color: var(--dropdown-bg-color);
  backdrop-filter: var(--dropdown-bg-filter);
  box-shadow: var(--dropdown-box-shadow);
  padding: 0;
  margin: 0;
  list-style: none;
  border-radius: var(--dropdown-border-radius);
  max-height: var(--DropdownContainer-freeHeight);
  overflow-y: auto;
}

.MarkdownLinkAutocomplete-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.MarkdownLinkAutocomplete-row {
  --MarkdownLinkAutocomplete-rowHorPadding: 10px;
  cursor: pointer;
  &:last-child {
    border-radius: 0px 0px var(--dropdown-border-radius)
      var(--dropdown-border-radius) !important;
  }
  &:first-child {
    border-radius: var(--dropdown-border-radius) var(--dropdown-border-radius)
      0px 0px !important;
  }
  &:first-child:last-child {
    border-radius: var(--dropdown-border-radius) !important;
  }

  &.state-selected {
    background: var(--dropdown-hl-bg-color);
  }
}

.MarkdownLinkAutocomplete-error {
  padding: 2px 10px;
  color: var(--color-main-error);
}

.MarkdownLinkAutocomplete-row-asset {
  display: flex;
  flex: 1;
  text-decoration: none;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--local-text-color);
  padding-left: var(--MarkdownLinkAutocomplete-rowHorPadding);
  &:before {
    margin-right: 5px;
  }
}
.MarkdownLinkAutocomplete-row-item {
  display: flex;
  justify-content: space-between;
}
.MarkdownLinkAutocomplete-row-subitems {
  margin-left: 1px;
  min-width: 120px;
}

.MarkdownLinkAutocomplete-row-button-icon {
  margin-right: 5px;
}

.MarkdownLinkAutocomplete-arrowRight {
  margin-left: 5px;
}

.MarkdownLinkAutocomplete-row-button {
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: var(--MarkdownLinkAutocomplete-rowHorPadding);
  padding-right: var(--MarkdownLinkAutocomplete-rowHorPadding);
}

.MarkdownLinkAutocomplete-row-other {
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: var(--MarkdownLinkAutocomplete-rowHorPadding);
  padding-right: var(--MarkdownLinkAutocomplete-rowHorPadding);
}
</style>

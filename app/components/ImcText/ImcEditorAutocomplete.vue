<template>
  <div
    v-if="shownOptions.length > 0 || error"
    class="ImcEditorAutocomplete tiny-scrollbars"
  >
    <div v-if="loading" class="ImcEditorAutocomplete-loading loaderBar"></div>
    <div v-if="error" class="ImcEditorAutocomplete-error">
      {{ error }}
    </div>
    <template v-else>
      <div
        v-for="(opt, opt_index) of shownOptions"
        :key="opt.value"
        class="ImcEditorAutocomplete-row"
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
            <div class="ImcEditorAutocomplete-row-item">
              <asset-link
                v-if="opt.type === 'asset'"
                class="ImcEditorAutocomplete-row-asset"
                :project="project"
                :asset="opt.raw"
                :tooltip-show-path="true"
                @mouseenter="currentItem = opt_index"
                @mousedown="selectOption(opt)"
              ></asset-link>
              <button
                class="is-button is-button-icon ImcEditorAutocomplete-arrowRight"
                @click="toggle"
              >
                <i class="ri-arrow-right-s-fill"></i>
              </button>
            </div>
          </template>
          <imc-editor-autocomplete-asset-contents
            ref="itemContents"
            class="ImcEditorAutocomplete-row-subitems tiny-scrollbars"
            :asset-id="opt.value"
            @select="selectOption(opt, $event)"
          ></imc-editor-autocomplete-asset-contents>
        </menu-button>
        <div
          v-else-if="opt.type === 'button'"
          class="ImcEditorAutocomplete-row-button"
          @mouseenter="currentItem = opt_index"
          @mousedown="selectOption(opt)"
        >
          <i
            class="ImcEditorAutocomplete-row-button-icon"
            :class="
              opt.value === 'search-button'
                ? 'ri-search-line'
                : 'ri-add-circle-fill'
            "
          ></i>
          <span class="ImcEditorAutocomplete-row-button-title">
            {{ opt.title }}
          </span>
        </div>
        <div
          v-else
          class="ImcEditorAutocomplete-row-other"
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
import type { ImcLinkOption, ImcLinksModule } from './ImcLinksModule';
import './quill-init';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import DialogManager from '../../logic/managers/DialogManager';
import SelectAssetDialog from '../Asset/SelectAssetDialog.vue';
import ProjectManager from '../../logic/managers/ProjectManager';
import type Quill from 'quill';
import type { ImcEditorModule } from './ImcEditorModule';
import FastCreateAssetDialog from '../Asset/FastCreateAssetDialog.vue';
import AssetLink from '../Asset/AssetLink.vue';
import type { ProjectInfoForLink } from '../../logic/router/routes-helpers';
import { getQueryAssetPropsSelection } from '../../logic/expression/filter/filterExpression';
import MenuButton from '../Common/MenuButton.vue';
import { AssetContentTreePresenterVM } from '../Asset/ProjectTree/AssetContentTreePresenterVM';
import ImcEditorAutocompleteAssetContents from './ImcEditorAutocompleteAssetContents.vue';
import { convertTranslatedTitle } from '../../logic/utils/assets';
import { QuillKeys } from './utils';

type ImcEditorAutocompleteOption =
  | ImcLinkOption
  | { type: 'button'; value: string; title: string };

export default defineComponent({
  name: 'ImcEditorAutocomplete',
  components: {
    AssetLink,
    MenuButton,
    ImcEditorAutocompleteAssetContents,
  },
  props: {
    project: { type: Object as PropType<ProjectInfoForLink>, required: true },
    searchText: { type: String, default: '' },
    loading: { type: Boolean, default: false },
    options: { type: Array as PropType<ImcLinkOption[]>, required: true },
    hasMore: { type: Boolean, default: false },
    error: { type: String, default: '' },
    quill: { type: Object as PropType<Quill>, required: true },
  },
  emits: ['selected', 'buttonClicked'],
  data() {
    return {
      currentItem: 0,
      openedItemContents: -1,
      treePresenterVM: new AssetContentTreePresenterVM(),
    };
  },
  computed: {
    currentOption() {
      return this.currentItem < this.shownOptions.length
        ? this.shownOptions[this.currentItem]
        : null;
    },
    shownOptions() {
      const options: ImcEditorAutocompleteOption[] = [...this.options];
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
      let new_index = this.currentItem + dy;
      if (new_index < 0) new_index = 0;
      else if (new_index >= this.shownOptions.length)
        new_index = this.shownOptions.length - 1;
      this.currentItem = new_index;
    },
    async selectOption(
      option: ImcEditorAutocompleteOption,
      block?: { blockId: string; anchor?: string; title?: string },
    ) {
      const imclinks = this.quill.getModule('imclinks') as ImcLinksModule;
      if (!imclinks) return;
      const imceditor = this.quill.getModule('imceditor') as ImcEditorModule;
      if (!imceditor) return;

      imclinks.removeCurrentMarker();
      await new Promise((res) => setTimeout(res, 1)); // NOTE: даем отработать мышке полностью, чтобы поместить курсор туда, куда нужно

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
          imceditor.addModalPromise(modal);
          const res = await modal;
          if (res) {
            imclinks.insertImcLink({
              title: res.title,
              type: 'asset',
              value: res.id,
              raw: this.$getAppManager()
                .get(CreatorAssetManager)
                .getAssetShortViaCacheSync(res.id),
            } as ImcLinkOption);
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
          imceditor.addModalPromise(modal);
          const res = await modal;
          if (res) {
            imclinks.insertImcLink({
              title: res.title,
              type: 'asset',
              value: res.id,
              raw: this.$getAppManager()
                .get(CreatorAssetManager)
                .getAssetShortViaCacheSync(res.id),
            } as ImcLinkOption);
          }
        }
      } else {
        let title = option.title;
        if (block?.title) {
          title +=
            '|' +
            convertTranslatedTitle(block.title, (...args) => this.$t(...args));
        }
        imclinks.insertImcLink({
          ...option,
          blockId: block?.blockId,
          anchor: block?.anchor,
          title,
        });
      }
    },
    async selectCurrent() {
      this.moveCursor(0);
      const option = this.shownOptions[this.currentItem];
      if (!option) return;
      this.selectOption(option);
    },
    handleKey(key: string) {
      if (key === QuillKeys.UP) {
        this.moveCursor(-1);
        return false;
      } else if (key === QuillKeys.DOWN) {
        this.moveCursor(1);
        return false;
      } else if (key === QuillKeys.RIGHT) {
        if (this.currentOption && this.currentOption.type === 'asset') {
          this.openedItemContents = this.currentItem;
          this.$nextTick().then(() => {
            const itemContents = this.$refs['itemContents'] as
              | InstanceType<typeof ImcEditorAutocompleteAssetContents>[]
              | null;
            if (!itemContents || itemContents.length === 0) return;
            itemContents[0].focus();
          });
          return false;
        }
      }
      return true;
    },
  },
});
</script>

<style lang="scss" scoped>
@use '$style/asset-icons';

.ImcEditorAutocomplete {
  transform: translate(-10px, 0);
}
.ImcEditorAutocomplete,
.ImcEditorAutocomplete-row-subitems {
  max-width: 400px;
  text-align: left;
  background-color: var(--dropdown-bg-color);
  backdrop-filter: var(--dropdown-bg-filter);
  box-shadow: var(--dropdown-box-shadow);
  padding: 0;
  margin: 0;
  list-style: none;
  border-radius: var(--dropdown-border-radius);
  max-height: 70vh;
  overflow-y: auto;
}

.ImcEditorAutocomplete-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.ImcEditorAutocomplete-row {
  --ImcEditorAutocomplete-rowHorPadding: 10px;
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

.ImcEditorAutocomplete-error {
  padding: 2px 10px;
  color: var(--color-main-error);
}

.ImcEditorAutocomplete-row-asset {
  display: flex;
  flex: 1;
  text-decoration: none;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--local-text-color);
  padding-left: var(--ImcEditorAutocomplete-rowHorPadding);
  &:before {
    margin-right: 5px;
  }
}
.ImcEditorAutocomplete-row-item {
  display: flex;
  justify-content: space-between;
}
.ImcEditorAutocomplete-row-subitems {
  margin-left: 1px;
  min-width: 120px;
}

.ImcEditorAutocomplete-row-button-icon {
  margin-right: 5px;
}

.ImcEditorAutocomplete-arrowRight {
  margin-left: 5px;
}

.ImcEditorAutocomplete-row-button {
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: var(--ImcEditorAutocomplete-rowHorPadding);
  padding-right: var(--ImcEditorAutocomplete-rowHorPadding);
}
</style>

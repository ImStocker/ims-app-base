<template>
  <div class="CreateAssetBox is-dropdown">
    <project-tree-search
      v-model="searchValue"
      :autofocus="true"
      class="CreateAssetBox-search"
    ></project-tree-search>
    <div class="CreateAssetBox-list tiny-scrollbars">
      <div v-if="!searchValue" class="CreateAssetBox-list-default">
        <button
          v-for="opt of defaultOptions"
          :key="opt.id"
          class="CreateAssetBox-list-default-button"
          @click="createAsset(opt.id)"
        >
          <caption-string
            class="CreateAssetBox-list-default-button-caption"
            :class="{
              ['asset-icon-' + opt.icon]: !!opt.icon,
            }"
            :value="opt.title ?? undefined"
            :title="opt.tooltip"
          ></caption-string>
        </button>
        <button
          class="CreateAssetBox-list-default-button"
          @click="createAsset()"
        >
          <span
            class="CreateAssetBox-list-default-button-caption asset-icon-search-line"
          >
            {{ $t('asset.other') }}
          </span>
        </button>
      </div>
      <div v-else class="CreateAssetBox-list-assets">
        <project-tree-presenter
          :show-asset-inheritance="true"
          :hide-empty-workspaces="true"
          :asset-where="projectTreeWhere"
          :show-workspace-tree="false"
          selection-mode="single"
          :additional-options="defaultOptionsInOther"
          :no-items-caption="$t('gddPage.menu.noBaseElement')"
          @update:selection="createAsset($event[0].id)"
        ></project-tree-presenter>
        <div class="CreateAssetBox-list-default">
          <button class="CreateAssetBox-list-default-button" @click="choose()">
            <caption-string
              class="CreateAssetBox-list-default-button-caption asset-icon-add-line"
              :value="$t('gddPage.menu.createElementWithThisName')"
            ></caption-string>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, inject } from 'vue';
import ProjectTreeSearch from './ProjectTree/ProjectTreeSearch.vue';
import type { AssetPropValueSelection } from '../../logic/types/Props';
import ProjectTreePresenter from './ProjectTree/ProjectTreePresenter.vue';
import {
  AssetPropWhereOpKind,
  type AssetPropWhere,
} from '../../logic/types/PropsWhere';
import {
  ASSET_SELECTION_DIAGRAM,
  ASSET_SELECTION_ENUM,
  ASSET_SELECTION_GAME_MECHANICS,
  ASSET_SELECTION_GAME_OBJECT,
  ASSET_SELECTION_LEVEL,
  ASSET_SELECTION_MARKDOWN,
  ASSET_SELECTION_SCRIPT,
  ASSET_SELECTION_STRUCTURE,
  TEXT_ELEMENT_ID,
} from '../../logic/constants';
import type {
  AssetForSelection,
  AssetSetDTO,
} from '../../logic/types/AssetsType';
import CaptionString from '../Common/CaptionString.vue';
import FastCreateAssetDialog from './FastCreateAssetDialog.vue';
import { openProjectLink } from '../../logic/router/routes-helpers';
import SelectAssetDialog from './SelectAssetDialog.vue';
import { v4 as uuidv4 } from 'uuid';
import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';

export default defineComponent({
  name: 'CreateAssetBox',
  components: {
    ProjectTreeSearch,
    ProjectTreePresenter,
    CaptionString,
  },
  props: {
    rootWorkspaceId: { type: String, required: true },
    rootWorkspaceType: { type: String, default: null },
  },
  setup() {
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    return {
      projectContext,
    };
  },
  data() {
    return {
      searchValue: null as AssetPropValueSelection | null,
    };
  },
  computed: {
    projectInfo() {
      return this.projectContext.projectInfo;
    },
    defaultOptions(): (AssetForSelection & { tooltip: string })[] {
      return [
        {
          id: TEXT_ELEMENT_ID,
          title: '[[t:TextElement]]',
          name: null,
          icon: 'file-fill',
        },
        this.$appConfiguration.isDesktop ? ASSET_SELECTION_MARKDOWN : null,
        ASSET_SELECTION_GAME_OBJECT,
        ASSET_SELECTION_GAME_MECHANICS,
        ASSET_SELECTION_DIAGRAM,
        ASSET_SELECTION_SCRIPT,
        ASSET_SELECTION_LEVEL,
      ]
        .filter((x) => x)
        .map((x) => {
          return {
            ...x,
            tooltip: this.$t('asset.createTooltips.' + x?.id),
          };
        });
    },
    defaultOptionsInOther() {
      return [
        ...this.defaultOptions,
        ASSET_SELECTION_STRUCTURE,
        ASSET_SELECTION_ENUM,
      ];
    },
    projectTreeWhere(): AssetPropWhere {
      const gdd_id = this.projectContext
        .get(AssetSubContext)
        .getWorkspaceByNameViaCacheSync('gdd')?.id;
      let res = gdd_id
        ? ({
            workspaceids: gdd_id,
          } as AssetPropWhere)
        : {};
      if (this.searchValue) {
        res = {
          ...res,
          search: {
            op: AssetPropWhereOpKind.AND,
            v: [this.searchValue.Where],
          },
        };
      }
      return res;
    },
  },
  methods: {
    async choose() {
      if (this.searchValue && this.searchValue.Str !== '') {
        await this.createAsset(TEXT_ELEMENT_ID, this.searchValue.Str);
      }
    },
    dispatchMenuActionExecutedEvent() {
      if (!this.$el) return;
      const imcMenuActionExecuted = new CustomEvent(
        'imc-menu-action-executed',
        {
          bubbles: true,
          detail: { item: undefined },
        },
      );
      this.$el.dispatchEvent(imcMenuActionExecuted);
    },
    async createAsset(parent_id?: string, title: string | null = null) {
      this.dispatchMenuActionExecutedEvent();
      if (!parent_id) {
        const parent_asset = await this.projectContext
          .get(DialogSubContext)
          .show(SelectAssetDialog, {
            where: {
              workspaceids:
                (
                  await this.projectContext
                    .get(AssetSubContext)
                    .getWorkspaceByNameViaCache('gdd')
                )?.id ?? null,
            },
            additionalOptions: this.defaultOptionsInOther,
          });
        if (!parent_asset) {
          return;
        }
        parent_id = parent_asset.id;
      }

      const set: AssetSetDTO = {
        workspaceId: this.rootWorkspaceId,
      };

      if (parent_id === TEXT_ELEMENT_ID) {
        set.blocks = {
          ['@' + uuidv4()]: { type: 'text' },
        };
      } else {
        set.parentIds = [parent_id];
      }

      if (title) {
        set.title = title;
      }

      const new_asset = await this.projectContext
        .get(DialogSubContext)
        .show(FastCreateAssetDialog, {
          set: { ...set },
          parentId: parent_id,
          disableChangeType: true,
          disableChangeWorkspace: false,
        });
      if (new_asset && this.projectInfo) {
        openProjectLink(this.$getAppManager(), this.projectInfo, {
          name: 'project-asset-by-id',
          params: {
            assetId: new_asset.id,
          },
        });
      }
    },
  },
});
</script>
<style lang="scss" scoped>
@use '$style/asset-icons';

.CreateAssetBox {
  padding: var(--dropdown-padding);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.CreateAssetBox-list {
  overflow: auto;
  max-height: 50vh;
}
.CreateAssetBox-list-default {
  display: flex;
  flex-direction: column;
}
.CreateAssetBox-list-default-button {
  border: none;
  text-align: left;
  background-color: transparent;
  color: var(--local-text-color);
  padding: 0;
  cursor: pointer;
  border-radius: var(--panel-border-radius);

  &:hover {
    background: var(--local-hl-bg-color);
  }
}
.CreateAssetBox-list-default-button-caption {
  &:before,
  i {
    margin-right: 2px;
    position: relative;
    font-size: 14px;
    display: inline-block;
  }

  @include asset-icons.asset-icons;
}
</style>

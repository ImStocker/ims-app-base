<template>
  <centered-page class="AssetsPageContent" :bread-crumbs="breadCrumbs">
    <template #header>
      <div class="AssetsPageContent-SystemPanel">
        <div
          v-if="isSystemAsset"
          class="AssetsPageContent-SystemPanel-TopPanel"
        >
          {{ $t('baseObjects.baseObject') }}
          <button
            class="is-button accent"
            :class="{ loading: baseCreating }"
            :disabled="baseCreating"
            @click="createUserAsset()"
          >
            {{ $t('baseObjects.clickToEdit') }}
          </button>
        </div>
        <asset-page-header ref="header" :vm="vm"></asset-page-header>
      </div>
    </template>
    <template #content-left-column>
      <div class="AssetsPageContent-leftColumn"></div>
    </template>
    <template #content-right-column>
      <div class="AssetsPageContent-rightColumn"></div>
    </template>
    <div class="AssetsPageContent-active-element tiny-scrollbars">
      <width-resizer
        v-model:content-width="contentWidth"
        :min-width="ASSET_FULL_EDITOR_MIN_WIDTH"
        :initial-width="ASSET_FULL_EDITOR_INITIAL_WIDTH"
        :resize-side="'right'"
      >
        <asset-full-editor
          ref="editor"
          class="AssetsPageContent-active-element-editor"
          :asset-editor="vm.assetFullEditorVM"
          :show-comments="true"
          :request-root-toolbar-target="requestToolbarTarget"
        >
        </asset-full-editor>
      </width-resizer>
    </div>
    <template
      v-if="contentsTableWithAnchors.length > 0 && currentAssetFull"
      #right
    >
      <asset-page-contents-table
        class="AssetsPageContent-contents"
        :contents-table="contentsTableWithAnchors"
        :current-anchor-tag-id="currentAnchorTagId"
        :asset-id="currentAssetFull.id"
      ></asset-page-contents-table>
    </template>
  </centered-page>
</template>

<script lang="ts">
import { defineComponent, type PropType, type UnwrapRef } from 'vue';
import AssetFullEditor from '../Editor/AssetFullEditor.vue';
import ProjectManager from '../../../logic/managers/ProjectManager';
import UiPreferenceManager from '../../../logic/managers/UiPreferenceManager';
import WidthResizer from '../../Common/WidthResizer.vue';

import {
  ASSET_FULL_EDITOR_INITIAL_WIDTH,
  ASSET_FULL_EDITOR_MIN_WIDTH,
} from '../../layoutConstants';
import CenteredPage from '../../Common/CenteredPage.vue';
import type { BreadCrumbsEntity } from '../../../logic/types/BreadCrumbs';
import {
  getScrollEdgeState,
  getScrollParentNode,
} from '../../utils/DomElementUtils';
import {
  getCurrentUrl,
  openProjectLink,
} from '../../../logic/router/routes-helpers';
import { DISCUSSION_ASSET_ID } from '../../../logic/constants';
import type { AssetPageVM } from '../../../logic/vm/AssetPageVM';
import AssetPageHeader from '../Editor/AssetPageHeader.vue';
import CreatorAssetManager from '../../../logic/managers/CreatorAssetManager';
import UiManager from '../../../logic/managers/UiManager';
import type { BlockContentItem } from '../../../logic/types/BlockTypeDefinition';
import AssetPageContentsTable from '../Editor/AssetPageContentsTable.vue';
import EditorManager, {
  type EditorContextForAssetRequested,
} from '../../../logic/managers/EditorManager';
import { makeAnchorTagId } from '../../../logic/utils/assets';

export default defineComponent({
  name: 'AssetsPageContent',
  components: {
    AssetFullEditor,
    WidthResizer,
    CenteredPage,
    AssetPageHeader,
    AssetPageContentsTable,
  },
  props: {
    vm: {
      type: Object as PropType<UnwrapRef<AssetPageVM>>,
      required: true,
    },
    breadCrumbs: {
      type: Array as PropType<BreadCrumbsEntity[]>,
      default: null,
    },
  },
  data() {
    return {
      menuToggleState: true,
      ASSET_FULL_EDITOR_INITIAL_WIDTH,
      ASSET_FULL_EDITOR_MIN_WIDTH,
      isRenaming: false,
      currentAnchorTagId: null as string | null,
      isMaskActive: false,
      baseCreating: false,
      editorContextForAssetRequest:
        null as EditorContextForAssetRequested | null,
      expectScrolling: null as NodeJS.Timeout | null,
    };
  },
  computed: {
    isSystemAsset() {
      return this.currentAssetFull
        ? this.currentAssetFull.projectId !== this.projectInfo?.id
        : false;
    },
    currentHref() {
      const url = getCurrentUrl();
      return url.origin + url.pathname;
    },
    contentsTableWithAnchors(): BlockContentItem<any>[] {
      if (!this.currentAssetFull) return [];
      if (this.isAssetDiscussion) return [];
      const context = this.editorContextForAssetRequest?.get();
      if (!context) return [];
      return context
        .getContentItems()
        .filter((item) => item.anchor !== undefined);
    },
    currentAssetFull() {
      return this.vm.assetFullEditorVM.getOpenedAssetFull();
    },
    isAssetDiscussion() {
      return this.currentAssetFull
        ? this.currentAssetFull.typeIds.includes(DISCUSSION_ASSET_ID)
        : false;
    },
    isReadonly() {
      return this.vm.assetFullEditorVM.getIsReadonly();
    },
    contentWidth: {
      get(): number {
        return this.$getAppManager()
          .get(UiPreferenceManager)
          .getPreference(
            'AssetsPageContent.contentWidth',
            ASSET_FULL_EDITOR_INITIAL_WIDTH,
          );
      },
      set(val: number) {
        this.$getAppManager()
          .get(UiPreferenceManager)
          .setPreference('AssetsPageContent.contentWidth', val);
      },
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    scrollableElement() {
      return getScrollParentNode(this.$el);
    },
  },
  watch: {
    currentAssetFull() {
      this.resetEditorContext(true);
    },
  },
  async mounted() {
    if (this.scrollableElement) {
      this.scrollableElement.addEventListener('scroll', this.handleScroll, {
        passive: true,
      });
    }
    this.resetEditorContext(true);
    this.handleScroll();
  },
  unmounted() {
    if (this.scrollableElement) {
      this.scrollableElement.removeEventListener('scroll', this.handleScroll);
    }
    this.resetEditorContext(false);
  },
  methods: {
    resetEditorContext(init: boolean) {
      if (this.editorContextForAssetRequest) {
        this.editorContextForAssetRequest.release();
        this.editorContextForAssetRequest = null;
      }
      if (init) {
        this.editorContextForAssetRequest = this.currentAssetFull
          ? this.$getAppManager()
              .get(EditorManager)
              .requestEditorContextForAsset(this.currentAssetFull.id)
          : null;
      }
    },
    async createUserAsset() {
      if (this.baseCreating) {
        return;
      }
      const base_asset = this.currentAssetFull;
      if (!base_asset) {
        return;
      }

      this.baseCreating = true;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          let target_workspace_id: string | null = null;
          const base_workspace = base_asset.workspaceId
            ? ((
                await this.$getAppManager()
                  .get(CreatorAssetManager)
                  .getWorkspacesList({
                    where: {
                      ids: [base_asset.workspaceId],
                      isSystem: true,
                    },
                  })
              ).list[0] ?? null)
            : null;

          if (base_workspace && base_workspace.name) {
            target_workspace_id = this.$getAppManager()
              .get(ProjectManager)
              .getWorkspaceIdByName(base_workspace.name);
          }

          if (!target_workspace_id) {
            target_workspace_id = this.$getAppManager()
              .get(ProjectManager)
              .getWorkspaceIdByName('settings');
          }

          const result = await this.$getAppManager()
            .get(CreatorAssetManager)
            .createAsset({
              id: base_asset.id,
              set: {
                title: base_asset.ownTitle ?? undefined,
                parentIds: base_asset.parentIds,
                name: base_asset.name ?? undefined,
                icon: base_asset.ownIcon ?? undefined,
                workspaceId: target_workspace_id,
                isAbstract: base_asset.isAbstract,
              },
            });
          if (this.projectInfo) {
            await openProjectLink(this.$getAppManager(), this.projectInfo, {
              name: 'project-asset-by-id',
              params: {
                assetId: result.ids[0],
              },
            });
          }
        });
      this.baseCreating = false;
    },
    handleScroll() {
      if (
        !this.contentsTableWithAnchors ||
        this.contentsTableWithAnchors.length === 0
      )
        return;
      if (this.expectScrolling) return;

      if (this.scrollableElement) {
        const scroll_state = getScrollEdgeState(this.scrollableElement);
        if (scroll_state.yBegin) {
          this.currentAnchorTagId = makeAnchorTagId(
            this.contentsTableWithAnchors[0].blockId,
            this.contentsTableWithAnchors[0].anchor,
          );
          return;
        } else if (scroll_state.yEnd) {
          this.currentAnchorTagId = makeAnchorTagId(
            this.contentsTableWithAnchors[
              this.contentsTableWithAnchors.length - 1
            ].blockId,
            this.contentsTableWithAnchors[
              this.contentsTableWithAnchors.length - 1
            ].anchor,
          );
          return;
        }
      }

      const window_height =
        window.innerHeight || document.documentElement.clientHeight;

      let min_distance_from_top = Infinity;

      if (this.currentAnchorTagId) {
        const current_anchor_element = document.getElementById(
          this.currentAnchorTagId,
        );
        if (current_anchor_element) {
          const current_anchor_bounds =
            current_anchor_element.getBoundingClientRect();
          if (
            current_anchor_bounds.top < window_height &&
            current_anchor_bounds.bottom > 0
          ) {
            return;
          }
        }
      }

      for (const anchor of this.contentsTableWithAnchors) {
        if (anchor.anchor === undefined) {
          continue;
        }
        const anchor_id = makeAnchorTagId(anchor.blockId, anchor.anchor);
        const anchor_element = document.getElementById(anchor_id);
        if (anchor_element) {
          const anchor_element_rect = anchor_element.getBoundingClientRect();
          const { top, bottom } = anchor_element_rect;

          if (bottom > 0 && bottom <= window_height) {
            if (bottom < min_distance_from_top) {
              min_distance_from_top = top;
              this.currentAnchorTagId = anchor_id;
            }
          }
        }
      }
    },
    async requestToolbarTarget(): Promise<HTMLElement | null> {
      const header = this.$refs['header'] as InstanceType<
        typeof AssetPageHeader
      > | null;
      if (!header) return null;
      return await header.requestToolbarTarget();
    },
    async revealAssetBlock(blockId: string, anchor?: string): Promise<boolean> {
      const editor = this.$refs['editor'] as InstanceType<
        typeof AssetFullEditor
      > | null;
      if (!editor) return false;
      if (this.expectScrolling) clearTimeout(this.expectScrolling);
      this.expectScrolling = setTimeout(() => {
        this.expectScrolling = null;
        this.currentAnchorTagId = makeAnchorTagId(blockId, anchor);
      }, 1000);
      this.currentAnchorTagId = makeAnchorTagId(blockId, anchor);
      return editor.revealAssetBlock(blockId, anchor);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins';

.AssetsPageContent-leftColumn {
  width: 25px;
  height: 100%;

  @include devices-mixins.device-type(not-pc) {
    width: 12px;
  }
}

.AssetsPageContent-rightColumn {
  width: 25px;
  height: 100%;

  @include devices-mixins.device-type(not-pc) {
    width: 12px;
  }
}

.AssetsPageContent {
  :deep(.CenteredPage-content) {
    display: flex;
    flex-direction: column;
  }
}

.AssetsPageContent-active-element > .WidthResizer {
  height: auto;
  display: flex;
  flex: 1;
  flex-direction: column;

  @include devices-mixins.device-type(not-pc) {
    width: 100% !important;
  }
}

.AssetsPageContent {
  display: flex;
  height: 100%;
}

.AssetsPageContent-active-element {
  font-size: var(--local-font-size);
  flex: 1;
  display: flex;
  flex-direction: column;
}

.AssetsPageContent-active-element-editor {
  height: 100%;
  flex: 1;
  @include devices-mixins.device-type(not-pc) {
    width: 100%;
  }
}

.AssetsPageContent-contents {
  position: fixed;
  width: 200px;
}
.AssetsPageContent-SystemPanel {
  width: 100%;
}
.AssetsPageContent-SystemPanel-TopPanel {
  border: 1px solid var(--color-accent);
  border-radius: 4px;
  padding: 20px;
  margin-bottom: 10px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

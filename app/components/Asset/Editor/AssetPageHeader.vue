<template>
  <div class="AssetPageHeader">
    <div v-if="isRenamingInProcNewTitle" class="loaderBarFloat"></div>
    <div class="AssetPageHeader-header">
      <div class="AssetPageHeader-title">
        <asset-icon-color-control
          :asset-icon-class="headerIcon"
          :asset-color-name="assetColorName"
          :can-change="canChange"
          :apply-save="true"
          :asset-id="vm.assetId"
        />
        <div class="AssetPageHeader-titles">
          <div class="App-header">
            <renamable-text
              v-model:is-renaming-mode-state="isRenaming"
              :value="selectionInfo.rawCaption"
              :disabled="!canRename"
              @change="renameAsset($event)"
            >
              <h1 :title="canRename ? $t('gddPage.dblClickToRename') : ''">
                <caption-string :value="selectionInfo.caption" />
              </h1>
            </renamable-text>
          </div>
          <div
            v-if="
              commonParent &&
              !isAssetDiscussion &&
              !projectIsHub &&
              !layoutDescriptor.props.headerHideParent
            "
            class="AssetPageHeader-parent"
          >
            ←
            <asset-link
              class="AssetPageHeader-parent-link"
              :class="{
                'state-deleted': !!commonParent.deletedAt,
              }"
              :project="vm.assetFullEditorVM.projectInfo"
              :asset="commonParent"
              :show-icon="false"
              :open-popup="true"
            ></asset-link>
          </div>
        </div>
      </div>
      <div v-if="vm.asset?.name" class="AssetPageHeader-assetName">
        <i class="ri-price-tag-3-fill"></i>
        <span>{{ vm.asset.name }}</span>
      </div>
      <div
        v-if="toolbarRequested"
        ref="toolbar"
        class="AssetPageHeader-toolbar"
      ></div>
      <div class="AssetPageHeader-manage">
        <asset-completion-check-widget
          class="AssetPageHeader-completion"
          :asset-id="vm.assetId"
        ></asset-completion-check-widget>
        <button
          v-if="selectionInfo.hasLocale"
          class="is-button is-button-icon AssetPageHeader-manage-locale"
          :title="$t('gddPage.localization')"
          @click="openLocale()"
        >
          <i class="ri-earth-fill"></i>
        </button>
        <button
          v-if="selectionInfo.hasProps"
          class="is-button is-button-icon AssetPageHeader-manage-properties"
          :title="$t('gddPage.properties')"
          @click="openProps()"
        >
          <i class="ri-list-unordered"></i>
        </button>
        <button
          v-if="userIsAdmin && !isSystemAsset && !isDesktop"
          class="is-button is-button-icon AssetPageHeader-manage-share"
          :title="$t('gddPage.share')"
          @click="openSetUpAccessDialog()"
        >
          <i class="ri-share-fill"></i>
        </button>
        <div class="AssetPageHeader-manage-gear">
          <asset-settings
            :asset-editor="vm.assetFullEditorVM"
            @delete="deleteAsset"
          ></asset-settings>
        </div>
      </div>
    </div>
    <request-sign-in-block
      v-if="needShowRequestSignInBlock"
      class="AssetPageHeader-requestSignIn"
      :title="'auth.needAuthToEdit'"
    ></request-sign-in-block>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType, type UnwrapRef } from 'vue';
import type { AssetPageVM } from '../../../logic/vm/AssetPageVM';
import AuthManager from '../../../logic/managers/AuthManager';
import { MIN_ASSET_RIGHTS_TO_CHANGE } from '../../../logic/types/Rights';
import ProjectManager from '../../../logic/managers/ProjectManager';
import {
  BLOCK_NAME_META,
  DISCUSSION_ASSET_ID,
  HUB_PID,
} from '../../../logic/constants';
import { convertTranslatedTitle } from '../../../logic/utils/assets';
import CreatorAssetManager from '../../../logic/managers/CreatorAssetManager';
import DialogManager from '../../../logic/managers/DialogManager';
import ConfirmDialog from '../../Common/ConfirmDialog.vue';
import UiManager from '../../../logic/managers/UiManager';
import { openProjectLink } from '../../../logic/router/routes-helpers';
import SetUpAccessDialog from '../Rights/SetUpAccessDialog.vue';
import RequestSignInBlock from '../../Form/RequestSignInBlock.vue';
import AssetLink from '../AssetLink.vue';
import RenamableText from '../../Common/RenamableText.vue';
import AssetSettings from '../AssetSettings.vue';
import CaptionString from '../../Common/CaptionString.vue';
import AssetIconColorControl from '../AssetIconColorControl.vue';
import { calcResolvedBlocks } from '../../../logic/types/AssetFullInstance';
import AssetCompletionCheckWidget from '../Completion/AssetCompletionCheckWidget.vue';
import AssetPropsDialog from '../AssetPropsDialog.vue';
import EditorManager from '../../../logic/managers/EditorManager';

export default defineComponent({
  name: 'AssetPageHeader',
  components: {
    RequestSignInBlock,
    AssetLink,
    RenamableText,
    AssetSettings,
    CaptionString,
    AssetCompletionCheckWidget,
    AssetIconColorControl,
  },
  props: {
    vm: {
      type: Object as PropType<UnwrapRef<AssetPageVM>>,
      required: true,
    },
  },
  data() {
    return {
      isRenaming: false,
      isRenamingInProcNewTitle: null as null | string,
      toolbarRequested: false,
    };
  },
  computed: {
    isDesktop() {
      return this.$getAppManager().$appConfiguration.isDesktop;
    },
    layoutDescriptor() {
      if (!this.currentAssetFull) {
        return this.$getAppManager()
          .get(EditorManager)
          .getDefaultLayoutDescriptor();
      }
      return this.$getAppManager()
        .get(EditorManager)
        .getLayoutDescriptorForAsset(this.currentAssetFull);
    },
    isSystemAsset() {
      return this.currentAssetFull
        ? this.currentAssetFull.projectId !== this.projectInfo?.id
        : false;
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    userInfo() {
      return this.$getAppManager().get(AuthManager).getUserInfo();
    },
    allowAnonymUsers() {
      return this.$getAppManager().get(ProjectManager).getAllowAnonymUsers();
    },
    needShowRequestSignInBlock() {
      if (this.allowAnonymUsers) return false;
      return (
        !this.userInfo &&
        this.vm.asset &&
        this.vm.asset.rights &&
        this.vm.asset.rights >= MIN_ASSET_RIGHTS_TO_CHANGE
      );
    },
    userIsAdmin() {
      return this.$getAppManager().get(ProjectManager).isAdmin();
    },
    projectIsHub() {
      return !!(this.projectInfo
        ? this.projectInfo.parentsTree.find((p) => p.id === HUB_PID)
        : false);
    },
    commonParent() {
      return this.vm.assetFullEditorVM.getCommonParent();
    },
    selectionInfo() {
      let icon: string | null = null;
      const iconSame = true;
      let caption = '';
      let rawCaption = '';
      let hasLocale = false;
      let hasProps = false;
      const opened_asset = this.vm.assetFullEditorVM.getOpenedAssetFull();
      if (opened_asset) {
        rawCaption = this.isRenamingInProcNewTitle
          ? this.isRenamingInProcNewTitle
          : opened_asset.title;
        caption = convertTranslatedTitle(rawCaption, (key) => this.$t(key));
        icon = opened_asset.icon;
        const blocks = calcResolvedBlocks(opened_asset);
        if (this.layoutDescriptor.props.headerLocaleButton) {
          hasLocale = blocks.list.some(
            (b) => b.name === 'locale' && b.type === 'locale',
          );
        }
        if (this.layoutDescriptor.props.headerPropsButton) {
          hasProps = blocks.list.some(
            (b) => b.name === 'props' && b.type === 'props',
          );
        }
      }
      return {
        icon,
        iconSame,
        caption,
        rawCaption,
        hasLocale,
        hasProps,
      };
    },
    currentAssetFull() {
      return this.vm.assetFullEditorVM.getOpenedAssetFull();
    },
    isAssetDiscussion() {
      return this.currentAssetFull
        ? this.currentAssetFull.typeIds.includes(DISCUSSION_ASSET_ID)
        : false;
    },
    canRename() {
      return this.vm.asset
        ? this.$getAppManager()
            .get(CreatorAssetManager)
            .canRenameAsset(this.vm.asset)
        : false;
    },
    canChange() {
      return this.vm.asset
        ? this.$getAppManager()
            .get(CreatorAssetManager)
            .canChangeAsset(this.vm.asset)
        : false;
    },
    headerIcon() {
      const icon_class_base = 'asset-icon-';
      if (this.isAssetDiscussion) {
        return icon_class_base + 'message-2-fill';
      } else {
        if (this.selectionInfo.iconSame) {
          return (
            icon_class_base +
            (this.selectionInfo.icon ? this.selectionInfo.icon : 'file-fill')
          );
        } else {
          return icon_class_base + 'multiple';
        }
      }
    },
    assetColorName() {
      const asset_full = this.currentAssetFull;
      if (!asset_full) return null;
      const color = asset_full.getPropValue(BLOCK_NAME_META, 'color').value;
      return typeof color === 'string' && color ? color : null;
    },
  },
  methods: {
    async deleteAsset() {
      const element = this.currentAssetFull;
      if (!element) return;
      const answer = await this.$getAppManager()
        .get(DialogManager)
        .show(ConfirmDialog, {
          header: this.$t('sourcePage.elements.delete') + '?',
          message: this.$t('sourcePage.elements.deleteElementConfirm', {
            element: convertTranslatedTitle(element.title, (key) =>
              this.$t(key),
            ),
          }),
          yesCaption: this.$t('common.dialogs.delete'),
          danger: true,
        });
      if (answer) {
        await this.$getAppManager()
          .get(UiManager)
          .doTask(async () => {
            await this.$getAppManager()
              .get(CreatorAssetManager)
              .deleteAssets({
                where: {
                  id: [element.id],
                },
              });

            if (this.projectInfo) {
              if (element.workspaceId) {
                openProjectLink(this.$getAppManager(), this.projectInfo, {
                  name: 'project-workspace-by-id',
                  params: {
                    workspaceId: element.workspaceId,
                  },
                });
              } else {
                openProjectLink(this.$getAppManager(), this.projectInfo, {
                  name: 'project-main',
                });
              }
            }
          });
        return true;
      }
    },
    async openSetUpAccessDialog() {
      await this.$getAppManager().get(DialogManager).show(SetUpAccessDialog, {
        assetId: this.vm.assetId,
      });
    },
    async openLocale() {
      const asset_full = this.vm.assetFullEditorVM.getOpenedAssetFull();
      if (!asset_full) return null;
      await this.$getAppManager().get(DialogManager).show(AssetPropsDialog, {
        assetFull: asset_full,
        propName: 'locale',
      });
    },
    async openProps() {
      const asset_full = this.vm.assetFullEditorVM.getOpenedAssetFull();
      if (!asset_full) return null;
      await this.$getAppManager().get(DialogManager).show(AssetPropsDialog, {
        assetFull: asset_full,
        propName: 'props',
      });
    },
    async startRenaming() {
      if (this.canRename) {
        this.isRenaming = true;
      }
    },
    async renameAsset(new_name: string) {
      const asset = this.vm.assetFullEditorVM.getOpenedAssetFull();
      if (!asset) return;
      this.isRenamingInProcNewTitle = new_name;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.$getAppManager()
            .get(CreatorAssetManager)
            .changeAssets({
              where: {
                id: [asset.id],
              },
              set: {
                title: new_name,
              },
            });
        });
      this.isRenamingInProcNewTitle = null;
    },
    async requestToolbarTarget(): Promise<HTMLElement | null> {
      this.toolbarRequested = true;
      await this.$nextTick();
      return (this.$refs['toolbar'] ?? null) as HTMLElement | null;
    },
  },
});
</script>

<style lang="scss" scoped>
.AssetPageHeader {
  width: 100%;
  margin-bottom: 10px;
}
.AssetPageHeader-header {
  display: flex;
  gap: 10px;
  align-items: center;
  flex: 1;
  flex-wrap: wrap;
}
.AssetPageHeader-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;

  .App-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 0px;
  }
}
.AssetPageHeader-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  h1,
  :deep(.ImsTextInput) {
    font-size: 17px;
    font-weight: 600;
    color: var(--local-text-color);
    line-height: 1.2em;

    @media (max-width: 700px) {
      font-size: var(--local-font-size);
    }
  }
}
.AssetPageHeader-parent {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--local-sub-text-color);
  font-size: 12.5px;
  line-height: 1em;
}

.AssetPageHeader-parent-link {
  color: var(--local-sub-text-color);
  text-decoration: none;
  cursor: pointer;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }

  &.state-deleted {
    color: var(--color-main-error);
  }
}
.AssetPageHeader-manage {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.AssetPageHeader-manage-share,
.AssetPageHeader-manage-locale,
.AssetPageHeader-manage-properties {
  --button-font-size: 20px;
}
.AssetPageHeader-manage-gear {
  display: flex;
  align-items: center;
  justify-content: center;

  :deep(.is-button-dropdown) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--local-border-color);
    border-radius: 9px;
    background: transparent;
    color: var(--local-sub-text-color);
    transition:
      color 0.15s ease,
      border-color 0.15s ease,
      background 0.15s ease;

    i {
      font-size: 17px;
    }

    &:hover {
      color: var(--color-accent);
      border-color: var(--color-accent);
      background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    }
  }
}
.AssetPageHeader-requestSignIn {
  margin-top: 15px;
}
.AssetPageHeader-assetName {
  flex: none;
  font-size: 12.5px;
  font-weight: normal;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  color: var(--color-accent);
  max-width: 220px;

  i {
    flex: none;
    font-size: 14px;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>

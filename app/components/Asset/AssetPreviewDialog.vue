<template>
  <dialog-content class="AssetPreviewDialog" @escape-press="choose()">
    <div
      v-if="assetEditor.loadError || !assetEditor.loadDone"
      class="AssetPreviewDialog-loading-wrapper"
    >
      <div
        v-if="!assetEditor.loadDone"
        class="loaderSpinner PageLoaderSpinner"
      ></div>
      <div v-else-if="assetEditor.loadError" class="error-message-block">
        {{ assetEditor.loadError }}
      </div>
    </div>
    <template v-else>
      <div class="AssetPreviewDialog-Content">
        <div v-if="saving" class="loaderBar loaderBar-saving"></div>
        <div class="AssetPreviewDialog-Content-Header">
          <i
            :class="[
              'asset-icon-' +
                (currentAssetFull?.icon ? currentAssetFull.icon : 'file-fill'),
              'AssetFullEditor-Header-Title-icon',
              'AssetPreviewDialog-Content-Header-icon',
            ]"
          >
          </i>
          <renamable-text
            ref="renaming"
            v-model:is-renaming-mode-state="isRenamingMode"
            class="AssetPreviewDialog-assetTitle"
            :title="currentAssetFull?.title"
            :value="currentAssetFull?.title"
            :get-default-renaming-range="getDefaultRenamingRange"
            :get-renaming-value="getRenamingValue"
            :word-wrap="true"
            :disabled="isReadOnly"
            @change="renameAsset($event)"
          >
            <div class="AssetCaption-name-title">
              <caption-string
                :value="currentAssetFull?.title ?? ''"
              ></caption-string>
            </div>
          </renamable-text>
        </div>
        <div v-if="currentAssetFull" class="AssetPreviewDialog-Content-Parent">
          <div
            v-if="toolbarRequested"
            ref="toolbar"
            class="AssetPreviewDialog-toolbar"
          ></div>
          <asset-completion-check-widget
            class="AssetPreviewDialog-header-completion"
            :asset-id="currentAssetFull.id"
          ></asset-completion-check-widget>
          <button
            v-if="!refIsDeleted && dialog.state.deleteRef && !isReadOnly"
            class="is-button danger AssetPreviewDialog-Content-Parent-button"
            @click="deleteRef()"
          >
            {{ $t('boardPage.deleteRef') }}
          </button>
          <project-link
            v-if="assetLinkTo && projectInfo"
            :project="projectInfo"
            :to="assetLinkTo"
            target="_blank"
            :title="$t('gddPage.openNewTab')"
            class="is-button is-button-icon-small AssetPreviewDialog-Content-Parent-link"
            @click="openAssetInNewTab($event)"
          >
            <i class="ri-external-link-fill"></i>
          </project-link>
          <button
            v-if="canChange && selectionInfo.hasProps"
            class="is-button is-button-icon AssetPreviewDialog-properties"
            :title="$t('gddPage.properties')"
            @click="openProps()"
          >
            <i class="ri-list-unordered"></i>
          </button>
          <button
            v-if="userIsAdmin && !isDesktop"
            class="is-button is-button-icon AssetPreviewDialog-share"
            :title="$t('gddPage.share')"
            @click="openSetUpAccessDialog()"
          >
            <i class="ri-share-fill"></i>
          </button>
          <AssetSettings
            v-if="!isReadOnly"
            class="AssetPreviewDialog-options"
            :asset-editor="assetEditor"
            @delete="deleteAsset()"
          />
        </div>
      </div>
      <div class="AssetPreviewDialog-main">
        <RequestSignInBlock
          v-if="needShowRequestSignInBlock"
          :title="'auth.needAuthToEdit'"
        ></RequestSignInBlock>
        <div class="AssetPreviewDialog-main-common">
          <div class="AssetPreviewDialog-main-common-content">
            <asset-full-editor
              v-if="currentAssetFull"
              ref="fullEditor"
              :asset-editor="assetEditor"
              :request-root-toolbar-target="requestToolbarTarget"
              @update:is-dirty="isDirty = $event"
            ></asset-full-editor>
            <div v-else class="AssetPreviewDialog-main-common-error">
              {{ $t('common.notFound') }}
            </div>
          </div>
        </div>
      </div>

      <div class="Form-row-buttons">
        <div class="Form-row-buttons-center">
          <div class="AssetPreviewDialog-footer use-buttons-action">
            <button class="is-button is-button-normal" @click="choose()">
              {{ $t('common.dialogs.close') }}
            </button>
          </div>
          <div
            v-if="isDirty"
            class="AssetPreviewDialog-footer use-buttons-action"
          >
            <button
              class="is-button is-button-normal"
              :disabled="blockSaving"
              @click="saveChanges()"
            >
              {{ $t('common.dialogs.save') }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </dialog-content>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../Dialog/DialogContent.vue';
import type { Member } from '../../logic/types/ProjectTypes';
import type { AssetShort } from '../../logic/types/AssetsType';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import AssetSettings from './AssetSettings.vue';
import CaptionString from '../Common/CaptionString.vue';
import type { AssetFullInstanceR } from '../../logic/types/AssetFullInstance';
import ProjectManager from '../../logic/managers/ProjectManager';
import RenamableText from '../Common/RenamableText.vue';
import DialogManager, {
  type DialogInterface,
} from '../../logic/managers/DialogManager';
import ConfirmDialog from '../Common/ConfirmDialog.vue';
import UiManager from '../../logic/managers/UiManager';
import ProjectLink from '../Common/ProjectLink.vue';
import { AssetFullEditorVM } from '../../logic/vm/AssetFullEditorVM';
import RequestSignInBlock from '../Form/RequestSignInBlock.vue';
import { MIN_ASSET_RIGHTS_TO_CHANGE } from '../../logic/types/Rights';
import AuthManager from '../../logic/managers/AuthManager';
import SetUpAccessDialog from './Rights/SetUpAccessDialog.vue';
import { convertTranslatedTitle } from '../../logic/utils/assets';
import AssetFullEditor from './Editor/AssetFullEditor.vue';
import AssetCompletionCheckWidget from './Completion/AssetCompletionCheckWidget.vue';
import AssetPropsDialog from './AssetPropsDialog.vue';
import {
  BLOCK_NAME_LOCALE,
  BLOCK_NAME_PROPS,
  BLOCK_TYPE_LOCALE,
  BLOCK_TYPE_PROPS,
  LEVEL_ASSET_ID,
  SCRIPT_ASSET_ID,
  TASK_ASSET_ID,
} from '../../logic/constants';
import { calcResolvedBlocks } from '../../logic/types/AssetFullInstance';
import type { SubscriberHandler } from '../../logic/types/Subscriber';
import EditorManager from '../../logic/managers/EditorManager';

type DialogProps = {
  assetId: string;
  deleteRef?: (silent?: boolean) => Promise<boolean> | boolean;
};

type DialogResult = AssetFullInstanceR | null;

export default defineComponent({
  name: 'AssetPreviewDialog',
  components: {
    DialogContent,
    AssetSettings,
    AssetFullEditor,
    RenamableText,
    ProjectLink,
    CaptionString,
    RequestSignInBlock,
    AssetCompletionCheckWidget,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  emits: ['dialog-parameters'],
  data() {
    let mountPromiseResolve!: () => void;
    let mountPromiseReject!: (err: Error) => void;
    const mountPromise = new Promise<void>((res, rej) => {
      mountPromiseResolve = res;
      mountPromiseReject = rej;
    });
    return {
      buttonIsPressed: false,
      members: [] as Member[],
      assetShorts: [] as AssetShort[],
      assetEditor: new AssetFullEditorVM(
        this.$getAppManager(),
        this.dialog ? this.dialog.state.assetId : null,
      ),
      isRenamingMode: false,
      saving: false,
      refIsDeleted: false,
      factTimePlaceholder: this.$t('boardPage.factTime') as any,
      isDirty: false,
      blockSaving: false,
      assetEventsHandler: null as SubscriberHandler | null,
      toolbarRequested: false,
      mountPromise,
      mountPromiseResolve,
      mountPromiseReject,
    };
  },
  computed: {
    selectionInfo() {
      let hasProps = false;
      const opened_asset = this.assetEditor.getOpenedAssetFull();
      if (opened_asset) {
        const blocks = calcResolvedBlocks(opened_asset);
        if (
          opened_asset.typeIds.includes(SCRIPT_ASSET_ID) ||
          opened_asset.typeIds.includes(LEVEL_ASSET_ID)
        ) {
          hasProps = blocks.list.some(
            (b) => b.name === 'props' && b.type === 'props',
          );
        }
      }
      return {
        hasProps,
      };
    },
    isDesktop() {
      return this.$appConfiguration.isDesktop;
    },
    userIsAdmin() {
      return this.$getAppManager().get(ProjectManager).isAdmin();
    },
    allowAnonymUsers() {
      return this.$getAppManager().get(ProjectManager).getAllowAnonymUsers();
    },
    needShowRequestSignInBlock() {
      if (this.allowAnonymUsers) return false;
      return (
        !this.userInfo &&
        this.currentAssetFull &&
        this.currentAssetFull.rights &&
        this.currentAssetFull.rights >= MIN_ASSET_RIGHTS_TO_CHANGE
      );
    },
    userInfo() {
      return this.$getAppManager().get(AuthManager).getUserInfo();
    },
    currentAssetFull(): AssetFullInstanceR | null {
      return this.assetEditor.getOpenedAssetFull();
    },
    isReadOnly() {
      return this.assetEditor.getIsReadonly();
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    assetLinkTo() {
      return {
        name: 'project-asset-by-id',
        params: {
          assetId: this.dialog.state.assetId,
        },
      };
    },
    canManageTasks() {
      return this.$getAppManager().get(ProjectManager).getUserRoleInProject();
    },
    assetCaption() {
      const asset_caption = this.currentAssetFull?.title
        ? this.currentAssetFull.title
        : '';
      return asset_caption;
    },
    canChange() {
      return this.currentAssetFull
        ? this.$getAppManager()
            .get(CreatorAssetManager)
            .canChangeAsset(this.currentAssetFull)
        : false;
    },
    openedAssetId() {
      return this.dialog.state.assetId;
    },
  },
  watch: {
    isDirty() {
      this.$emit('dialog-parameters', {
        forbidClose: this.isDirty,
      });
    },
    currentAsset() {
      this.$emit('dialog-parameters', {
        defaultCloseValue: this.currentAssetFull,
      });
    },
  },
  async mounted() {
    try {
      this.$getAppManager().get(EditorManager).currentEditorPage = this;

      await this.loadAsset();
      this.assetShorts = [];

      (this.dialog as any).addBeforeCloseMethod(async () => {
        await new Promise((res) => setTimeout(res, 10));
      });
      this.assetEventsHandler = this.$getAppManager()
        .get(CreatorAssetManager)
        .assetEvents.subscribe(async (ev) => {
          if (!this.projectInfo) return;
          if (!this.currentAssetFull) return;

          const current_asset = this.currentAssetFull;
          if (!current_asset) return;

          // Update asset if referenced assets changed
          const current_asset_tracking = !!current_asset.getPropValue(
            '__meta',
            'complete_track',
            false,
          ).value;
          if (current_asset_tracking) {
            let reload_asset = false;
            for (const upserted_id of ev.upsert.ids) {
              const upserted_asset: AssetShort | undefined = ev.upsert.objects
                .assetFulls[upserted_id]
                ? ev.upsert.objects.assetFulls[upserted_id]
                : ev.upsert.objects.assetShorts[upserted_id];
              if (!upserted_asset) continue;
              if (!upserted_asset.typeIds.includes(TASK_ASSET_ID)) {
                continue;
              }
              reload_asset = current_asset.references.some((ref) => {
                return ref.targetAssetId === upserted_id;
              });
              if (reload_asset) break;
            }

            if (reload_asset) {
              await this.$getAppManager()
                .get(CreatorAssetManager)
                .getAssetInstance(current_asset.id, true);
            }
          }

          if (ev.deletedIds.includes(current_asset.id)) {
            this.dialog.close();
            return;
          }
        });
      this.mountPromiseResolve();
    } catch (err: any) {
      this.mountPromiseReject(err);
    }
  },
  unmounted() {
    const editor_manager = this.$getAppManager().get(EditorManager);
    if (editor_manager.currentEditorPage === this) {
      editor_manager.currentEditorPage = null;
    }
    if (this.assetEventsHandler) {
      this.assetEventsHandler.unsubscribe();
      this.assetEventsHandler = null;
    }
  },
  methods: {
    openAssetInNewTab(e: MouseEvent) {
      if (this.isDesktop) {
        e.preventDefault();
        this.dialog.close();
        this.$getAppManager().get(UiManager).openLink(this.assetLinkTo, true);
      }
    },
    async awaitMount(): Promise<void> {
      await this.mountPromise;
    },
    async openProps() {
      const asset_full = this.assetEditor.getOpenedAssetFull();
      if (!asset_full) return;
      await this.$getAppManager().get(DialogManager).show(AssetPropsDialog, {
        assetFull: asset_full,
        propName: 'props',
      });
    },
    async saveChanges() {
      if (!this.$refs['fullEditor']) return;
      this.blockSaving = true;
      try {
        await (
          this.$refs['fullEditor'] as InstanceType<typeof AssetFullEditor>
        ).saveChanges();
        this.choose();
      } finally {
        this.blockSaving = false;
      }
    },
    async openSetUpAccessDialog() {
      await this.$getAppManager().get(DialogManager).show(SetUpAccessDialog, {
        assetId: this.dialog.state.assetId,
      });
    },
    async renameAsset(new_val: string) {
      this.saving = true;
      await this.$getAppManager()
        .get(CreatorAssetManager)
        .changeAssets({
          where: {
            id: this.dialog.state.assetId,
          },
          set: {
            title: new_val,
          },
        });
      this.saving = false;
    },
    getRenamingValue() {
      return this.currentAssetFull?.title;
    },
    getDefaultRenamingRange(str: string) {
      return {
        from: 0,
        to: str.length,
      };
    },
    changeRenamingMode() {
      if (this.canManageTasks) {
        this.isRenamingMode = true;
      }
    },
    async loadAsset() {
      await this.assetEditor.load();
    },
    getAssetShortById(asset_id: string) {
      return this.assetShorts.find((a) => a.id === asset_id);
    },
    async deleteRef(silent?: boolean) {
      if (this.dialog.state.deleteRef) {
        const res = await this.dialog.state.deleteRef(silent);
        this.refIsDeleted = res;
      }
    },
    choose() {
      this.dialog.close(this.currentAssetFull);
    },
    async deleteAsset() {
      const answer = await this.$getAppManager()
        .get(DialogManager)
        .show(ConfirmDialog, {
          header: this.$t('sourcePage.elements.delete') + '?',
          message: this.$t('sourcePage.elements.deleteElementConfirm', {
            element: convertTranslatedTitle(
              this.currentAssetFull?.title ?? '',
              (key) => this.$t(key),
            ),
          }),
          yesCaption: this.$t('common.dialogs.delete'),
          danger: true,
        });
      if (answer) {
        await this.$getAppManager()
          .get(UiManager)
          .doTask(async () => {
            await this.deleteRef(true);
            if (this.assetEditor.openedAssetId) {
              await this.$getAppManager()
                .get(CreatorAssetManager)
                .deleteAssets({
                  where: {
                    id: [this.assetEditor.openedAssetId],
                  },
                });
            }
          });
        this.choose();
      }
    },
    async requestToolbarTarget(): Promise<HTMLElement | null> {
      this.toolbarRequested = true;
      await this.$nextTick();
      return (this.$refs['toolbar'] ?? null) as HTMLElement | null;
    },
    async revealAssetBlock(blockId: string, anchor?: string): Promise<boolean> {
      await this.awaitMount();

      if (!this.currentAssetFull) {
        return false;
      }
      const blocks = await this.currentAssetFull.resolveBlocks();
      const resolved_block = blocks.mapIds[blockId];
      if (!resolved_block) return false;

      if (
        resolved_block.name === BLOCK_NAME_LOCALE &&
        resolved_block.type === BLOCK_TYPE_LOCALE &&
        this.selectionInfo.hasProps
      ) {
        this.openLocale();
        return true;
      }
      if (
        resolved_block.name === BLOCK_NAME_PROPS &&
        resolved_block.type === BLOCK_TYPE_PROPS &&
        this.selectionInfo.hasProps
      ) {
        this.openProps();
        return true;
      }

      const layout = this.$refs['fullEditor'] as InstanceType<
        typeof AssetFullEditor
      >;

      return layout.revealAssetBlock(blockId, anchor);
    },
    async openLocale() {
      const asset_full = this.currentAssetFull;
      if (!asset_full) return null;
      await this.$getAppManager().get(DialogManager).show(AssetPropsDialog, {
        assetFull: asset_full,
        propName: 'locale',
      });
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/asset-icons';
@use '$style/devices-mixins';

.AssetPreviewDialog {
  width: 800px;
  max-width: 800px;
  padding: 0px 0px 20px 0px;

  --local-bg-color: var(--editor-bg-color);
}
.AssetPreviewDialog-loading-wrapper {
  display: flex;
  flex: 1;
  padding: 10px;
}
.AssetPreviewDialog-Content {
  border-bottom: 1px solid #2c2b29;
  padding: 20px 15px 20px 18px;
  display: flex;
  align-items: center;

  &.inArchive {
    background-color: #888;
  }
}

.AssetPreviewDialog-Content-input {
  width: 100%;
}

.AssetPreviewDialog-Content-Header {
  width: 100%;
  font-size: 16px;
  font-weight: bold;
  display: flex;
}

.AssetPreviewDialog-Content-Header-icon {
  font-size: 20px;
}

.AssetPreviewDialog-Content-Parent {
  color: #ccc;
  display: flex;
  gap: 10px;
  font-size: 24px;
  margin-left: 24px;
  max-height: 24px;
  align-items: center;

  .AssetPreviewDialog-options {
    display: flex;
  }
}

.AssetPreviewDialog-main {
  max-width: 100%;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.AssetPreviewDialog-main-common {
  display: flex;
  &-error {
    color: var(--color-main-error);
    font-size: 16px;
  }

  @include devices-mixins.device-type(not-pc) {
    flex-direction: column;
    gap: 20px;
  }
}

.AssetPreviewDialog-main-common-AssetBlockEditor {
  width: 100%;
}

.AssetPreviewDialog-main-common-TaskSettings {
  @include devices-mixins.device-type(pc) {
    min-width: 200px;
    margin-left: 11px;
  }

  @include devices-mixins.device-type(not-pc) {
    width: 100%;
  }
}

.AssetPreviewDialog-Content-Header-TaskNum {
  margin-right: 18px;
}

.AssetPreviewDialog-Content-Parent-button {
  width: max-content;
}

.AssetPreviewDialog-Content-Parent-link {
  --button-font-size: 24px;
}

.AssetPreviewDialog-main-common-content {
  flex: 1;
  min-width: 0;
}

.AssetPreviewDialog.type-task {
  .AssetPreviewDialog-main-common-content {
    max-width: 550px;
  }
}

.AssetPreviewDialog-main-common-content-result {
  margin-bottom: 15px;
}

.AssetPreviewDialog-assetTitle {
  align-items: center;
}

.AssetPreviewDialog-footer {
  text-align: center;
}
.AssetPreviewDialog-properties,
.AssetPreviewDialog-share {
  --button-font-size: 20px;
}

.AssetPreviewDialog:deep(.ref-AssetBlockFullHeightEditor) {
  min-height: 65dvh;
}
</style>

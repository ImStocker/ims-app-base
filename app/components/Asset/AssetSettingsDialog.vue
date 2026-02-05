<template>
  <dialog-content class="AssetSettingsDialog" :loading="!loadingDone">
    <div class="Dialog-header">
      {{ dialogHeader }}
    </div>
    <div v-if="loadingError" class="error-message-block">
      {{ loadingError }}
    </div>
    <template v-else-if="asset">
      <div class="AssetSettingsDialog-settings">
        <div class="AssetSettingsDialog-setting">
          <div class="AssetSettingsDialog-setting-name">
            {{ $t('fields.title') }}:
          </div>
          <div
            class="AssetSettingsDialog-setting-input AssetSettingsDialog-setting-flex"
          >
            <div
              v-if="assetCount > 1"
              class="AssetSettingsDialog-messages AssetSettingsDialog-setting-input"
            >
              {{ $t('assetEditor.differentValues') }}
            </div>
            <FormInput
              v-else
              class="AssetSettingsDialog-setting-input"
              :value="asset.title ?? ''"
              @input="asset.title = $event"
            />
            <FormCheckIcon
              :value="commonValues.icon ? (asset.icon ?? '') : 'more-line'"
              @input="asset.icon = $event"
            />
          </div>
        </div>
        <div v-if="!(assetCount > 1)" class="AssetSettingsDialog-setting">
          <div class="AssetSettingsDialog-setting-name">
            {{ $t('fields.serviceName') }}:
          </div>
          <div
            class="AssetSettingsDialog-setting-input AssetSettingsDialog-setting-flex"
          >
            <FormInput
              class="AssetSettingsDialog-setting-input"
              :value="asset.name ?? ''"
              @input="asset.name = $event"
            />
            <FormBuilderFieldTooltip :message="$t('fields.serviceNameHelp')" />
          </div>
        </div>
        <div class="AssetSettingsDialog-setting">
          <div class="AssetSettingsDialog-setting-name">
            {{ $t('fields.type') }}:
          </div>
          <div class="AssetSettingsDialog-setting-input">
            <select-parent-asset
              :parent="parent"
              :display-options="{ baseOpt: true, otherTitle: false }"
              :additional-options="additionalParentOpts"
              @select-parent="changeParent"
            ></select-parent-asset>
          </div>
        </div>
      </div>
      <AdvancedPropsSpoiler>
        <template #default>
          <div>
            <div class="AssetSettingsDialog-setting">
              <FormCheckBox
                :value="asset.isAbstract"
                :different-value="!commonValues.isAbstract"
                class="AssetSettingsDialog-setting-input AssetSettingsDialog-setting-checkbox"
                @input="asset.isAbstract = $event"
              >
                {{ $t('fields.isAbstract') }}
              </FormCheckBox>
              <FormBuilderFieldTooltip :message="$t('fields.isAbstractHelp')" />
            </div>
            <div class="AssetSettingsDialog-setting">
              <FormCheckBox
                :value="tracksProgress"
                class="AssetSettingsDialog-setting-input AssetSettingsDialog-setting-checkbox"
                @input="tracksProgress = $event"
              >
                {{ $t('fields.isTrackProgress') }}
              </FormCheckBox>
              <FormBuilderFieldTooltip
                :message="$t('fields.isTrackProgressHelp')"
              />
            </div>
          </div>
        </template>
      </AdvancedPropsSpoiler>
      <div class="Form-row-buttons">
        <div
          class="Form-row-buttons-center AssetSettingsDialog-buttons use-buttons-action"
        >
          <button class="is-button" @click="choose()">
            {{ $t('common.dialogs.cancelCaption') }}
          </button>
          <button
            class="is-button accent"
            :disabled="buttonIsPressed"
            @click="choose(true)"
          >
            {{
              dialog.state.assetIds.length > 0
                ? $t('common.dialogs.save')
                : $t('common.dialogs.create')
            }}
          </button>
        </div>
      </div>
    </template>
  </dialog-content>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent, type PropType } from 'vue';
import type {
  AssetsFullResult,
  AssetShort,
  AssetSetDTO,
  AssetForSelection,
} from '../../logic/types/AssetsType';
import DialogContent from '../Dialog/DialogContent.vue';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import FormInput from '../Form/FormInput.vue';
import AdvancedPropsSpoiler from '../Form/AdvancedPropsSpoiler.vue';
import FormCheckIcon from '../Form/FormCheckIcon.vue';
import UiManager from '../../logic/managers/UiManager';
import FormCheckBox from '../Form/FormCheckBox.vue';
import ProjectManager from '../../logic/managers/ProjectManager';
import SelectParentAsset from './SelectParentAsset.vue';
import type { DialogInterface } from '../../logic/managers/DialogManager';
import {
  ASSET_SELECTION_STRUCTURE,
  ASSET_SELECTION_ENUM,
  ASSET_SELECTION_GAME_OBJECT,
  ASSET_SELECTION_GAME_MECHANICS,
  BLOCK_NAME_META,
} from '../../logic/constants';

type DialogProps = {
  assetIds: string[];
  workspaceId?: string;
};

type DialogResult = AssetsFullResult | undefined;

export default defineComponent({
  name: 'AssetSettingsDialog',
  components: {
    DialogContent,
    FormInput,
    AdvancedPropsSpoiler,
    FormBuilderFieldTooltip: defineAsyncComponent(
      () => import('../Form/FormBuilderFieldTooltip.vue') as any,
    ),
    FormCheckIcon,
    FormCheckBox,
    SelectParentAsset,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  data() {
    return {
      loadingError: null as string | null,
      loadingDone: false,
      buttonIsPressed: false,
      asset: {
        name: null,
        title: null,
        type: null,
        icon: null,
        isAbstract: false,
        typeIds: [],
      } as Partial<AssetShort>,
      originalTracksProgress: false,
      tracksProgress: false,
      assets: [] as AssetShort[],
      commonValues: {
        icon: true,
        parent: true,
        isAbstract: true,
      },
      searchText: '' as string,
    };
  },
  computed: {
    assetCount() {
      return this.dialog.state.assetIds.length;
    },
    dialogHeader() {
      if (this.assetCount > 0) {
        return this.assetCount > 1
          ? this.$t('gddPage.multipleSettings', { cnt: this.assetCount })
          : this.$t('gddPage.settings');
      }
      return this.$t('sourcePage.elements.create');
    },
    selectAssetLabel() {
      if (this.assetCount > 1) {
        if (this.commonValues.parent) {
          if (this.asset.typeIds && this.asset.typeIds[0]) {
            return '';
          } else return this.$t('assetEditor.differentValues');
        }
        return this.$t('assetEditor.differentValues');
      }
      return '';
    },
    additionalParentOpts(): AssetForSelection[] {
      return [
        ASSET_SELECTION_GAME_OBJECT,
        ASSET_SELECTION_GAME_MECHANICS,
        ASSET_SELECTION_STRUCTURE,
        ASSET_SELECTION_ENUM,
      ];
    },
    parent(): AssetForSelection | null {
      const typeIds = this.asset.typeIds ?? [];
      if (this.commonValues.parent && typeIds && typeIds[0]) {
        if (this.getAssetByIdFromCache(typeIds[0])) {
          return this.getAssetByIdFromCache(typeIds[0]) ?? null;
        } else {
          const parent = this.additionalParentOpts.find(
            (opt) => opt.id === typeIds[0],
          );
          return parent ? parent : null;
        }
      }
      return null;
    },
  },
  async mounted() {
    await this.loadAsset();
  },
  methods: {
    async loadAsset() {
      this.loadingError = null;
      this.loadingDone = false;
      try {
        this.assets = (
          await this.$getAppManager()
            .get(CreatorAssetManager)
            .getAssetShortsList({
              where: {
                workspaceId: this.$getAppManager()
                  .get(ProjectManager)
                  .getWorkspaceIdByName('gdd'),
              },
            })
        ).list;
        if (this.assetCount > 0) {
          const editing_assets = (
            await this.$getAppManager()
              .get(CreatorAssetManager)
              .getAssetInstancesList({
                where: {
                  id: this.dialog.state.assetIds,
                },
              })
          ).list;
          if (editing_assets.length === 1) {
            this.asset = { ...editing_assets[0] };
          } else if (editing_assets.length > 1) {
            this.asset.icon = editing_assets[0].icon;
            this.asset.typeIds = editing_assets[0].typeIds ?? [];
            this.asset.isAbstract = editing_assets[0].isAbstract;
            for (const editing_asset of editing_assets) {
              if (this.asset.icon !== editing_asset.icon) {
                this.commonValues.icon = false;
              }
              if (
                this.asset.typeIds?.toString() !==
                editing_asset.typeIds?.toString()
              ) {
                this.commonValues.parent = false;
              }
              if (this.asset.isAbstract !== editing_asset.isAbstract) {
                this.commonValues.isAbstract = false;
              }
            }
          }
          if (editing_assets.length > 0) {
            for (const block of editing_assets[0].blocks) {
              if (block.name === BLOCK_NAME_META) {
                if (block.computed['complete_track']) {
                  this.originalTracksProgress = true;
                  this.tracksProgress = true;
                }
              }
            }
          }
        } else {
          if (this.dialog.state.workspaceId) {
            this.asset.workspaceId = this.dialog.state.workspaceId;
          }
        }
      } catch (err: any) {
        this.loadingError = err.message;
      } finally {
        this.loadingDone = true;
      }
    },
    async choose(val?: boolean) {
      if (this.buttonIsPressed) return;
      if (val && this.asset) {
        this.buttonIsPressed = true;
        const res = await this.$getAppManager()
          .get(UiManager)
          .doTask(async () => {
            const changing_asset: AssetSetDTO = {
              title: this.asset.title ?? undefined,
              parentIds: this.asset.typeIds,
              name: this.asset.name ?? undefined,
              icon: this.asset.icon ?? undefined,
              workspaceId: this.asset.workspaceId ?? undefined,
              isAbstract: this.asset.isAbstract,
            };

            if (this.tracksProgress !== this.originalTracksProgress) {
              changing_asset.blocks = {
                [BLOCK_NAME_META]: {
                  name: BLOCK_NAME_META,
                  type: 'props',
                  props: {
                    complete_track: this.tracksProgress,
                  },
                },
              };
            }

            let res: AssetsFullResult;
            if (this.assetCount > 0) {
              res = await this.$getAppManager()
                .get(CreatorAssetManager)
                .changeAssets({
                  where: {
                    id: this.dialog.state.assetIds,
                  },
                  set: changing_asset,
                });
            } else {
              res = await this.$getAppManager()
                .get(CreatorAssetManager)
                .createAsset({
                  set: {
                    ...changing_asset,
                    title: this.asset.title ?? '',
                  },
                });
            }
            this.dialog.close(res);
          });
        if (res.error) {
          this.buttonIsPressed = false;
        }
      } else {
        this.dialog.close();
      }
    },
    changeParent(ev: AssetForSelection | null) {
      if (ev && ev.id !== this.asset.id) {
        this.asset.typeIds = [ev.id];
      } else {
        this.asset.typeIds = [];
      }
      this.commonValues.parent = true;
    },
    getAssetByIdFromCache(
      assetId: string,
    ): AssetForSelection | null | undefined {
      return this.$getAppManager()
        .get(CreatorAssetManager)
        .getAssetShortViaCacheSync(assetId);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/asset-icons';
@use '$style/devices-mixins.scss';

.AssetSettingsDialog {
  color: var(--local-text-color);
  font-size: var(--local-font-size);
  padding: 20px;
  width: 500px;

  @include devices-mixins.device-type(not-pc) {
    width: 100%;
  }
}

.AssetSettingsDialog-header {
  font-weight: bold;
}

.AssetSettingsDialog-select {
  margin: 14px 0;
}

.AssetSettingsDialog-buttons {
  gap: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
}

.AssetSettingsDialog-settings {
  padding-bottom: 10px;
}

.AssetSettingsDialog-setting {
  display: flex;
  margin-bottom: 10px;
  font-size: var(--local-font-size);
  align-items: center;
}

.AssetSettingsDialog-setting-name {
  min-width: 130px;
}

.AssetSettingsDialog-setting-input {
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.AssetSettingsDialog-setting-flex {
  display: flex;
  align-items: center;
  gap: 10px;
}

.AssetSettingsDialog-setting-checkbox {
  margin-right: 10px;
}

.AssetSettingsDialog-setting-checkbox-label {
  width: 100%;
  cursor: pointer;
}

.AssetSettingsDialog-messages {
  font-style: italic;
  color: #999;
}
</style>

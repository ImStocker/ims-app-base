<template>
  <dialog-content
    class="FastCreateAssetDialog"
    :loading="!loadingDone"
    @escape-press="choose(false)"
    @enter-press="choose(true)"
  >
    <div v-if="loadingError" class="error-message-block">
      {{ loadingError }}
    </div>
    <template v-else>
      <div
        :class="{
          'FastCreateAssetDialog-columner': !disableChangeType,
          'FastCreateAssetDialog-rower': disableChangeType,
        }"
      >
        <select-workspace-combo-box
          class="FastCreateAssetDialog-directory-selector"
          :model-value="selectedWorkspace"
          :readonly="disableChangeWorkspace"
          :clearable="false"
          :where="{ insideId: gddWorkspaceId }"
          @update:model-value="selectWorkspace($event)"
        >
          <template #override-button="{ toggle, dropdownShown }">
            <button
              :class="{
                'SelectWorkspaceComboBox-menu-button': true,
                focus: dropdownShown,
              }"
              :disabled="disableChangeWorkspace"
            >
              <i class="SelectWorkspaceComboBox-icon ri-folder-fill"></i>
              <scrollable-horizontal-container
                :content-changed-key="contentChangedKey"
              >
                <template #content>
                  <span
                    v-for="(point, index) in route"
                    :key="point + '-' + index"
                    :class="{
                      'SelectWorkspaceComboBox-menu-button-hoverable':
                        !disableChangeWorkspace,
                    }"
                    @click="selectWorkspace(routeWorkspaces[index])"
                  >
                    {{ `${point} / ` }}
                  </span>
                  <span
                    :class="{
                      'SelectWorkspaceComboBox-menu-button-hoverable':
                        !disableChangeWorkspace,
                      'SelectWorkspaceComboBox-common-buttons':
                        !disableChangeWorkspace,
                      'SelectWorkspaceComboBox-common-buttons-hover':
                        !disableChangeWorkspace && buttonsCommonHover,
                    }"
                    @mouseenter="buttonsCommonHover = true"
                    @mouseleave="buttonsCommonHover = false"
                    @click="disableChangeWorkspace ? null : toggle()"
                  >
                    {{ selectedWorkspaceTitle }}
                  </span>
                </template>
              </scrollable-horizontal-container>
              <template v-if="!disableChangeWorkspace">
                <i
                  class="ri-arrow-down-s-line SelectWorkspaceComboBox-menu-icon SelectWorkspaceComboBox-menu-button-hoverable"
                  :class="{
                    'SelectWorkspaceComboBox-common-buttons':
                      !disableChangeWorkspace,
                    'SelectWorkspaceComboBox-common-buttons-hover':
                      !disableChangeWorkspace && buttonsCommonHover,
                    'state-open': dropdownShown,
                  }"
                  @mouseenter="buttonsCommonHover = true"
                  @mouseleave="buttonsCommonHover = false"
                  @click="disableChangeWorkspace ? null : toggle()"
                ></i>
              </template>
            </button>
          </template>
        </select-workspace-combo-box>
        <select-asset-type
          class="FastCreateAssetDialog-Types"
          :parent="parent"
          :disable-change-type="disableChangeType"
          @change-parent="parent = $event"
        />
      </div>
      <div class="FastCreateAssetDialog-Content">
        <FormInput
          :autofocus="true"
          class="FastCreateAssetDialog-Content-input"
          :value="title"
          :placeholder="$t('asset.inputTitle')"
          @input="title = $event"
        />
      </div>
      <div class="Form-row-buttons">
        <div class="Form-row-buttons-center use-buttons-action">
          <button class="is-button" @click="choose()">
            {{ $t('common.dialogs.cancelCaption') }}
          </button>
          <button
            class="is-button accent FastCreateAssetDialog-Form-row-button-create"
            :disabled="buttonIsPressed || !title"
            :class="{ loading: buttonIsPressed }"
            @click="choose(true)"
          >
            {{ $t('common.dialogs.create') }}
          </button>
        </div>
      </div>
    </template>
  </dialog-content>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type {
  AssetSetDTO,
  AssetShort,
  AssetsChangeResult,
  AssetsFullResult,
  WorkspaceForSelection,
} from '../../logic/types/AssetsType';
import DialogContent from '../Dialog/DialogContent.vue';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import FormInput from '../Form/FormInput.vue';
import UiManager from '../../logic/managers/UiManager';
import SelectAssetType from './FastCreateAssetDialogSelectType.vue';
import ProjectManager from '../../logic/managers/ProjectManager';
import type { DialogInterface } from '../../logic/managers/DialogManager';
import type { AssetFullInstanceR } from '../../logic/types/AssetFullInstance';
import SelectWorkspaceComboBox from './SelectWorkspaceComboBox.vue';
import {
  WORKSPACE_TYPE_COLLECTION,
  type Workspace,
} from '../../logic/types/Workspaces';
import { convertTranslatedTitle } from '../../logic/utils/assets';
import ScrollableHorizontalContainer from '../Common/ScrollableHorizontalContainer.vue';
import { TASK_ASSET_ID } from '../../logic/constants';

type DialogProps = {
  set?: AssetSetDTO;
  postCreateHook?: (
    res: AssetsChangeResult,
  ) => AssetsChangeResult | Promise<AssetsChangeResult>;
  disableChangeType?: boolean;
  disableChangeWorkspace?: boolean;
};

type DialogResult = AssetFullInstanceR | undefined;

export default defineComponent({
  name: 'FastCreateAssetDialog',
  components: {
    DialogContent,
    FormInput,
    SelectAssetType,
    SelectWorkspaceComboBox,
    ScrollableHorizontalContainer,
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
      title: this.dialog.state.set?.title ?? '',
      parentId: null as string | null,
      parent: null as AssetShort | null,

      selectedWorkspace: {} as WorkspaceForSelection,
      disableChangeTypeCurrentState: this.dialog.state.disableChangeType,
      currentRoute: '',
      route: [] as string[],
      routeWorkspaces: [] as WorkspaceForSelection[],
      contentChangedKey: 0,
      buttonsCommonHover: false,
    };
  },
  computed: {
    creatorAssetManager() {
      return this.$getAppManager().get(CreatorAssetManager);
    },
    isTask() {
      return this.parentId === TASK_ASSET_ID;
    },
    ProjectManager() {
      return this.$getAppManager().get(ProjectManager);
    },
    gddWorkspaceId() {
      return this.ProjectManager.getWorkspaceIdByName('gdd');
    },
    disableChangeWorkspace() {
      return this.dialog.state.disableChangeWorkspace;
    },
    disableChangeType() {
      if (this.dialog.state.disableChangeType) return true;
      return this.disableChangeTypeCurrentState;
    },
    selectedWorkspaceTitle() {
      return convertTranslatedTitle(
        this.selectedWorkspace.title || '',
        (key: any) => this.$t(key),
      );
    },
  },
  watch: {
    selectedWorkspace() {
      this.resolveParent();
      this.reloadRoute();
    },
  },
  created() {
    this.parentId =
      this.dialog.state.set?.parentIds &&
      this.dialog.state.set.parentIds.length > 0
        ? this.dialog.state.set.parentIds[0]
        : null;
  },
  async mounted() {
    if (this.dialog.state.set?.title) {
      this.title = this.dialog.state.set.title;
    }
    await this.load();
  },
  methods: {
    async load() {
      this.loadingDone = false;
      try {
        if (this.parentId) {
          const asset = await this.$getAppManager()
            .get(CreatorAssetManager)
            .getAssetShortViaCache(this.parentId);
          this.parent = asset;
        }

        if (
          !this.dialog.state ||
          !this.dialog.state.set ||
          !this.dialog.state.set.workspaceId
        )
          throw new Error('Incorrect dialog parameters');
        const workspace = await this.getWorkspaceById(
          this.dialog.state.set.workspaceId,
        );
        if (!workspace) throw new Error('Workspace not found');
        this.selectedWorkspace = workspace;
      } catch (err: any) {
        this.loadingError = err.message;
      } finally {
        this.loadingDone = true;
      }
    },
    async choose(val?: boolean) {
      if (this.buttonIsPressed) return;
      if (val && this.title) {
        this.buttonIsPressed = true;
        const res = await this.$getAppManager()
          .get(UiManager)
          .doTask(async () => {
            const res: AssetsFullResult & { limit?: boolean } =
              await this.creatorAssetManager.createAsset(
                {
                  set: {
                    ...(this.dialog.state.set ? this.dialog.state.set : {}),
                    title: this.title,
                    workspaceId: this.selectedWorkspace.id,
                    parentIds: this.parent ? [this.parent.id] : [],
                  },
                },
                this.dialog.state.postCreateHook,
              );
            if (res.limit) this.dialog.close();
            else {
              const res_id = res.ids[0];
              if (!res_id) throw new Error('Asset was not created');
              const instance =
                this.creatorAssetManager.getAssetInstanceViaCacheSync(res_id);
              if (!instance) throw new Error('Created asset not loaded');
              this.dialog.close(instance);
            }
          });
        if (res.error) {
          this.buttonIsPressed = false;
        }
      } else {
        this.dialog.close();
      }
    },
    async getWorkspaceById(workspaceId: string) {
      return await this.creatorAssetManager.getWorkspaceByIdViaCache(
        workspaceId,
      );
    },
    async getAssetParentById(parentId: string) {
      return await this.creatorAssetManager.getAssetShortViaCache(parentId);
    },
    resolveTypeState(workspace: Workspace | null) {
      return workspace?.props.type === WORKSPACE_TYPE_COLLECTION;
    },
    async resolveParent() {
      if (this.selectedWorkspace === null) {
        this.disableChangeTypeCurrentState = false;
        return;
      }

      const currentWorkspace = await this.getWorkspaceById(
        this.selectedWorkspace.id,
      );
      if (currentWorkspace?.props.type === WORKSPACE_TYPE_COLLECTION) {
        const assetType = currentWorkspace.props.asset;
        if (!assetType) {
          this.loadingError = 'Inherited asset not found';
          return;
        }
        this.parent = await this.getAssetParentById(
          assetType['AssetId'] as string,
        );
      } else this.disableChangeTypeCurrentState = false;
      this.disableChangeTypeCurrentState =
        this.resolveTypeState(currentWorkspace);
    },
    async reloadRoute() {
      const fullRoute = [] as string[];
      const parents = [] as WorkspaceForSelection[];
      const cyclesCheck = new Set<string>();
      if (!this.selectedWorkspace) {
        return;
      }
      let currentWorkspace = await this.getWorkspaceById(
        this.selectedWorkspace.id,
      );
      if (currentWorkspace) {
        cyclesCheck.add(currentWorkspace.id);
      }
      while (currentWorkspace?.parentId != null) {
        currentWorkspace = await this.getWorkspaceById(
          currentWorkspace.parentId,
        );
        if (currentWorkspace) {
          if (cyclesCheck.has(currentWorkspace.id)) break;
          fullRoute.push(
            convertTranslatedTitle(currentWorkspace.title, (key: any) =>
              this.$t(key),
            ),
          );
          parents.push(currentWorkspace);
          cyclesCheck.add(currentWorkspace.id);
        }
      }
      this.route = fullRoute;
      this.routeWorkspaces = parents;
      this.route.reverse();
      this.routeWorkspaces.reverse();
      this.contentChangedKey++;
    },
    async selectWorkspace(workspace: WorkspaceForSelection) {
      if (!this.disableChangeWorkspace) {
        const newWorkspace = await this.getWorkspaceById(workspace.id);
        if (
          this.disableChangeType &&
          newWorkspace &&
          newWorkspace.props.type === WORKSPACE_TYPE_COLLECTION &&
          newWorkspace.props.asset &&
          (newWorkspace.props.asset['AssetId'] as string) !== this.parent?.id
        )
          this.$getAppManager()
            .get(UiManager)
            .showError(
              this.$t('sourcePage.folders.collection.typeMismathInCollection'),
            );
        else this.selectedWorkspace = workspace;
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins.scss';
@use '$style/Form';
@use '$style/asset-icons';

.FastCreateAssetDialog {
  width: 700px;
  padding: 20px 0px;
}

.FastCreateAssetDialog-Content {
  border-bottom: 1px solid var(--local-border-color);
  margin-bottom: 20px;
  padding: 0 15px 8px 18px;
  display: flex;
  align-items: center;
}

.FastCreateAssetDialog-Types {
  padding: 0 15px 8px 18px;

  @include devices-mixins.device-type(not-pc) {
    padding: 0 15px 10px 18px;
  }
}

.FastCreateAssetDialog-Content-input {
  width: 100%;
}

.FastCreateAssetDialog-directory-selector {
  padding: 0 15px 8px 12px;

  @include devices-mixins.device-type(not-pc) {
    padding: 0 15px 10px 12px;
  }
}

.FastCreateAssetDialog-columner {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.FastCreateAssetDialog-rower {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.FastCreateAssetDialog-route-part {
  &:hover {
    color: red;
  }
}

.SelectWorkspaceComboBox-menu-button {
  display: flex;
  width: 100%;
  background-color: transparent;
  border-color: transparent;

  &:focus {
    border-color: transparent;
  }
  transition: 0.2s;
  color: #7d7d7d;
  font-size: 13px;
  font-weight: 500;
}

.SelectWorkspaceComboBox-menu-button-hoverable {
  cursor: pointer;
  &:hover {
    color: #bababa;
  }
}

.SelectWorkspaceComboBox-menu-icon {
  transition: transform 0.2s;

  &.state-open {
    transform: rotate(180deg);
  }
}

.SelectWorkspaceComboBox-menu-icon-clear {
  cursor: pointer;
  @include asset-icons.asset-icons;
}

.SelectWorkspaceComboBox-icon {
  margin-right: 6px;
}

.SelectWorkspaceComboBox-common-buttons {
  cursor: pointer;
}

.SelectWorkspaceComboBox-common-buttons-hover {
  color: #bababa;
}
</style>

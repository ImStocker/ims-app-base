<template>
  <dialog-content
    class="CreateWorkspaceDialog"
    @escape-press="choose(false)"
    @enter-press="choose(true)"
  >
    <div v-if="isLoading" class="CreateWorkspaceDialog-loading-wrapper">
      <div class="loaderSpinner PageLoaderSpinner"></div>
    </div>
    <div v-else-if="loadingError" class="error-message-block">
      {{ loadingError }}
    </div>
    <template v-else>
      <ValueSwitcher
        v-model="entityType"
        class="CreateWorkspaceDialog-Types"
        :options="typeOptions"
        value-prop="name"
      >
        <template #option="{ option }">
          <i
            v-if="option.icon"
            :class="option.icon"
            class="CreateWorkspaceDialog-Types-option-icon"
          ></i>
          <caption-string
            :value="$t('sourcePage.folders.types.' + option.name)"
            class="CreateWorkspaceDialog-Types-option-title"
          >
          </caption-string>
        </template>
      </ValueSwitcher>
      <div class="CreateWorkspaceDialog-Content">
        <FormInput
          :autofocus="true"
          class="CreateWorkspaceDialog-Content-input"
          :value="title"
          :placeholder="$t('asset.inputTitle')"
          @input="title = $event"
        />
        <div
          v-if="entityType === WORKSPACE_TYPE_COLLECTION"
          class="CreateWorkspaceDialog-Content-collection"
        >
          <div class="CreateWorkspaceDialog-Content-collection-info">
            {{ $t('sourcePage.folders.collection.hint') }}
          </div>
          <div class="CreateWorkspaceDialog-Content-collection-type">
            <div class="CreateWorkspaceDialog-Content-collection-type-label">
              {{ $t('sourcePage.folders.collection.type') }}:
            </div>
            <div class="CreateWorkspaceDialog-Content-collection-type-value">
              <select-asset-combo-box
                v-model="collectionType"
                :where="collectionTypeWhere"
                :readonly="dialog.state.fixedCollection"
                :additional-options="additionalOptions"
                :has-create-new-option="true"
                :add-button-title="$t('sourcePage.types.create')"
              >
              </select-asset-combo-box>
            </div>
          </div>
        </div>
      </div>
      <div class="Form-row-buttons">
        <div class="Form-row-buttons-center use-buttons-action">
          <button class="is-button" @click="choose(false)">
            {{ $t('common.dialogs.cancelCaption') }}
          </button>
          <button
            class="is-button accent CreateWorkspaceDialog-Form-row-button-create"
            :disabled="buttonIsPressed || !allowCreate"
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
import DialogContent from '../Dialog/DialogContent.vue';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import FormInput from '../Form/FormInput.vue';
import UiManager from '../../logic/managers/UiManager';
import ProjectManager from '../../logic/managers/ProjectManager';
import type { DialogInterface } from '../../logic/managers/DialogManager';
import {
  WORKSPACE_TYPE_COLLECTION,
  type ChangeWorkspaceRequest,
  type Workspace,
} from '../../logic/types/Workspaces';
import ValueSwitcher from '../Common/ValueSwitcher.vue';
import CaptionString from '../Common/CaptionString.vue';
import SelectAssetComboBox from './SelectAssetComboBox.vue';
import type { AssetForSelection } from '../../logic/types/AssetsType';
import { assert } from '../../logic/utils/typeUtils';
import type { AssetProps, AssetPropValueAsset } from '../../logic/types/Props';
import {
  ASSET_SELECTION_DIAGRAM,
  ASSET_SELECTION_ENUM,
  ASSET_SELECTION_GAME_MECHANICS,
  ASSET_SELECTION_GAME_OBJECT,
  ASSET_SELECTION_LEVEL,
  ASSET_SELECTION_SCRIPT,
  ASSET_SELECTION_STRUCTURE,
} from '../../logic/constants';

type WorkspaceTypeVariants = 'folder' | 'collection';

type DialogProps = {
  title?: string;
  parentId?: string | null;
  type?: WorkspaceTypeVariants;
  allowedTypes?: WorkspaceTypeVariants[];
  props?: AssetProps;
  fixedCollection?: boolean;
};

type DialogResult =
  | {
      type: WorkspaceTypeVariants;
      entity: Workspace;
    }
  | undefined;

export default defineComponent({
  name: 'CreateWorkspaceDialog',
  components: {
    DialogContent,
    FormInput,
    ValueSwitcher,
    CaptionString,
    SelectAssetComboBox,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  data() {
    return {
      isLoading: false,
      loadingError: null as string | null,
      buttonIsPressed: false,
      title: this.dialog.state.title ?? '',
      entityType:
        this.dialog.state.type ?? ('folder' as 'folder' | 'collection'),
      collectionType: null as AssetForSelection | null,
    };
  },
  computed: {
    additionalOptions(): AssetForSelection[] {
      return [
        ASSET_SELECTION_GAME_OBJECT,
        ASSET_SELECTION_GAME_MECHANICS,
        ASSET_SELECTION_DIAGRAM,
        ASSET_SELECTION_SCRIPT,
        ASSET_SELECTION_LEVEL,
        ASSET_SELECTION_STRUCTURE,
        ASSET_SELECTION_ENUM,
      ];
    },
    WORKSPACE_TYPE_COLLECTION() {
      return WORKSPACE_TYPE_COLLECTION;
    },
    creatorAssetManager() {
      return this.$getAppManager().get(CreatorAssetManager);
    },
    ProjectManager() {
      return this.$getAppManager().get(ProjectManager);
    },
    typeOptions(): {
      name: WorkspaceTypeVariants;
      icon: string | null;
    }[] {
      return [
        {
          name: 'folder' as WorkspaceTypeVariants,
          icon: 'ri-folder-fill',
        },
        {
          name: WORKSPACE_TYPE_COLLECTION as WorkspaceTypeVariants,
          icon: 'ri-table-view',
        },
      ].filter((option) => {
        if (this.dialog.state.fixedCollection) {
          if (option.name !== WORKSPACE_TYPE_COLLECTION) return false;
        }
        if (!this.dialog.state.allowedTypes) return true;
        return this.dialog.state.allowedTypes.includes(option.name);
      });
    },
    collectionTypeWhere() {
      const gdd_id = this.$getAppManager()
        .get(ProjectManager)
        .getWorkspaceIdByName('gdd');
      return {
        workspaceids: gdd_id,
      };
    },
    allowCreate() {
      if (!this.title || !this.title.trim()) return false;
      if (this.entityType === 'collection') {
        if (!this.collectionType) return false;
      }
      return true;
    },
  },
  async created() {
    this.isLoading = true;
    try {
      if (
        this.dialog.state.props &&
        this.dialog.state.props.asset &&
        (this.dialog.state.props.asset as AssetPropValueAsset).AssetId
      ) {
        this.collectionType = await this.$getAppManager()
          .get(CreatorAssetManager)
          .getAssetShortViaCache(
            (this.dialog.state.props.asset as AssetPropValueAsset).AssetId,
          );
      }
      this.entityType =
        this.dialog.state.type ??
        (this.typeOptions.length > 0 ? this.typeOptions[0].name : 'folder');
    } catch (err: any) {
      this.loadingError = err.message;
    } finally {
      this.isLoading = false;
    }
  },
  methods: {
    async choose(val: boolean) {
      if (!val) {
        this.dialog.close();
        return;
      }
      if (this.buttonIsPressed) return;
      if (!this.allowCreate) return;
      this.buttonIsPressed = true;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          const req: ChangeWorkspaceRequest = {
            title: this.title.trim(),
            parentId: this.dialog.state.parentId,
          };
          if (this.entityType === WORKSPACE_TYPE_COLLECTION) {
            assert(this.collectionType);
            req.props = {
              type: WORKSPACE_TYPE_COLLECTION,
              asset: {
                AssetId: this.collectionType.id,
                Title: this.collectionType.title ?? '',
                Name: this.collectionType.name,
              },
            };
          }
          const workspace = await this.$getAppManager()
            .get(CreatorAssetManager)
            .createWorkspace(req);
          this.dialog.close({
            entity: workspace,
            type: this.entityType,
          });
        });
      this.buttonIsPressed = false;
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins.scss';
@use '$style/Form';

.CreateWorkspaceDialog {
  width: 700px;
  padding: 20px 0px;
}

.CreateWorkspaceDialog-Content {
  border-bottom: 1px solid var(--local-border-color);
  margin-bottom: 20px;
  padding: 0 15px 8px 18px;
}

.CreateWorkspaceDialog-Content-collection-type {
  display: flex;
  align-items: center;
  gap: 10px;
}

.CreateWorkspaceDialog-Content-collection {
  padding-top: 10px;
}

.CreateWorkspaceDialog-Content-collection-info {
  margin-bottom: 10px;
}

.CreateWorkspaceDialog-Content-collection-type-value {
  flex: 1;
}

.CreateWorkspaceDialog-Types {
  --ValueSwitcher-border-radius: 4px;
  padding: 0 15px 8px 18px;

  @include devices-mixins.device-type(not-pc) {
    padding: 0 15px 10px 18px;
  }
}

.CreateWorkspaceDialog-Content-input {
  width: 100%;
}
.CreateWorkspaceDialog-Types-option-icon {
  margin-right: 5px;
}
.CreateWorkspaceDialog-loading-wrapper {
  display: flex;
  flex: 1;
  padding: 10px;
}
</style>

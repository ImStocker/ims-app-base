<template>
  <dialog-content
    class="ChangeCollectionTypeDialog"
    @escape-press="choose(false)"
    @enter-press="choose(true)"
  >
    <div class="Dialog-header">
      {{ $t('sourcePage.folders.collection.changeCollectionType') }}
    </div>
    <div class="ChangeCollectionTypeDialog-Content">
      <div class="ChangeCollectionTypeDialog-Content-collection">
        <div class="ChangeCollectionTypeDialog-Content-collection-type">
          <div class="ChangeCollectionTypeDialog-Content-collection-type-label">
            {{ $t('sourcePage.folders.collection.type') }}:
          </div>
          <div class="ChangeCollectionTypeDialog-Content-collection-type-value">
            <select-asset-combo-box
              v-model="collectionType"
              :where="collectionTypeWhere"
            ></select-asset-combo-box>
          </div>
        </div>
      </div>
    </div>
    <div class="Form-row-buttons">
      <div class="Form-row-buttons-center use-buttons-action">
        <button
          class="is-button"
          :disabled="buttonIsPressed"
          @click="choose(false)"
        >
          {{ $t('common.dialogs.cancelCaption') }}
        </button>
        <button
          class="is-button accent ChangeCollectionTypeDialog-Form-row-button-create"
          :disabled="buttonIsPressed || !allowChange"
          :class="{ loading: buttonIsPressed }"
          @click="choose(true)"
        >
          {{ $t('common.dialogs.change') }}
        </button>
      </div>
    </div>
  </dialog-content>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../Dialog/DialogContent.vue';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import UiManager from '../../logic/managers/UiManager';
import ProjectManager from '../../logic/managers/ProjectManager';
import type { DialogInterface } from '../../logic/managers/DialogManager';
import {
  WORKSPACE_TYPE_COLLECTION,
  type ChangeWorkspaceRequest,
} from '../../logic/types/Workspaces';
import SelectAssetComboBox from './SelectAssetComboBox.vue';
import type { AssetForSelection } from '../../logic/types/AssetsType';
import { assert } from '../../logic/utils/typeUtils';

type DialogProps = {
  workspaceId: string;
  collectionType: AssetForSelection | null;
};

type DialogResult =
  | {
      AssetId: string;
      Title: string;
      Name: string | null;
    }
  | undefined;

export default defineComponent({
  name: 'ChangeCollectionTypeDialog',
  components: {
    DialogContent,
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
      buttonIsPressed: false,
      collectionType: null as AssetForSelection | null,
    };
  },
  computed: {
    creatorAssetManager() {
      return this.$getAppManager().get(CreatorAssetManager);
    },
    ProjectManager() {
      return this.$getAppManager().get(ProjectManager);
    },
    collectionTypeWhere() {
      const gdd_id = this.$getAppManager()
        .get(ProjectManager)
        .getWorkspaceIdByName('gdd');
      return {
        workspaceids: gdd_id,
      };
    },
    allowChange() {
      return this.collectionType;
    },
  },
  mounted() {
    if (this.dialog.state.collectionType) {
      this.collectionType = this.dialog.state.collectionType;
    }
  },
  methods: {
    async choose(val: boolean) {
      if (!val) {
        this.dialog.close();
        return;
      }
      if (this.buttonIsPressed) return;
      if (!this.allowChange) return;
      this.buttonIsPressed = true;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          assert(this.collectionType);
          const nested_workspaces = await this.$getAppManager()
            .get(CreatorAssetManager)
            .getWorkspacesListAll({
              where: {
                insideId: this.dialog.state.workspaceId,
              },
            });

          const req: ChangeWorkspaceRequest = {
            props: {
              type: WORKSPACE_TYPE_COLLECTION,
              asset: {
                AssetId: this.collectionType.id,
                Title: this.collectionType.title ?? '',
                Name: this.collectionType.name,
              },
            },
          };

          const changing_workspace_ids = [
            this.dialog.state.workspaceId,
            ...nested_workspaces.list.map((w) => w.id),
          ];
          for (const workspace_id of changing_workspace_ids) {
            await this.$getAppManager()
              .get(CreatorAssetManager)
              .changeWorkspace(workspace_id, req);
          }

          await this.$getAppManager()
            .get(CreatorAssetManager)
            .changeAssets({
              where: {
                workspaceids: this.dialog.state.workspaceId,
              },
              set: {
                parentIds: [this.collectionType.id],
              },
            });

          this.dialog.close({
            AssetId: this.collectionType.id,
            Title: this.collectionType.title ?? '',
            Name: this.collectionType.name,
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

.ChangeCollectionTypeDialog {
  width: 700px;
  padding: 20px 0px;
}

.ChangeCollectionTypeDialog-Content {
  border-bottom: 1px solid var(--local-border-color);
  margin-bottom: 20px;
  padding: 0 15px 8px 18px;
}

.ChangeCollectionTypeDialog-Content-collection-type {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ChangeCollectionTypeDialog-Content-collection {
  padding-top: 10px;
}

.ChangeCollectionTypeDialog-Content-collection-info {
  margin-bottom: 10px;
}

.ChangeCollectionTypeDialog-Content-collection-type-value {
  flex: 1;
}

.ChangeCollectionTypeDialog-Types {
  --ValueSwitcher-border-radius: 4px;
  padding: 0 15px 8px 18px;

  @include devices-mixins.device-type(not-pc) {
    padding: 0 15px 10px 18px;
  }
}

.ChangeCollectionTypeDialog-Content-input {
  width: 100%;
}
.ChangeCollectionTypeDialog-Types-option-icon {
  margin-right: 5px;
}
</style>

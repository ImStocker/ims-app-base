<template>
  <dialog-content
    class="AssetRefsDialog"
    :loading="!loadingDone"
    @escape-press="choose(false)"
    @enter-press="choose(true)"
  >
    <div class="Dialog-header">
      {{ dialogHeader }}
    </div>
    <div v-if="loadingError" class="error-message-block">
      {{ loadingError }}
    </div>
    <template v-else>
      <div class="AssetRefsDialog-settings">
        <div class="AssetRefsDialog-setting">
          <div class="AssetRefsDialog-setting-name">
            {{ $t('gddPage.element') }}:
          </div>
          <select-asset-combo-box
            class="AssetRefsDialog-selectAsset"
            :model-value="selectedAsset"
            :where="selectAssetWhere"
            @update:model-value="changeAsset"
          >
          </select-asset-combo-box>
        </div>
      </div>
      <div class="Form-row-buttons">
        <div
          class="Form-row-buttons-center AssetRefsDialog-buttons use-buttons-action"
        >
          <button class="is-button" @click="choose()">
            {{ $t('common.dialogs.cancelCaption') }}
          </button>
          <button
            class="is-button accent"
            :disabled="buttonIsPressed"
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
  AssetForSelection,
  AssetReferencesResult,
} from '../../../logic/types/AssetsType';
import DialogContent from '../../Dialog/DialogContent.vue';
import CreatorAssetManager from '../../../logic/managers/CreatorAssetManager';
import UiManager from '../../../logic/managers/UiManager';
import ProjectManager from '../../../logic/managers/ProjectManager';
import SelectAssetComboBox from '../SelectAssetComboBox.vue';
import type { DialogInterface } from '../../../logic/managers/DialogManager';

type ParentElement = {
  id: string;
  title: string | null;
  icon: string | null;
};

type DialogProps = {
  assetIds: string[];
  blockId?: string;
  reverse?: boolean;
};

type DialogResult = AssetReferencesResult[];

export default defineComponent({
  name: 'AssetRefsDialog',
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
      loadingError: null as string | null,
      loadingDone: true,
      buttonIsPressed: false,
      targetAssetId: null as string | null,
    };
  },
  computed: {
    assetCount() {
      return this.dialog.state.assetIds.length;
    },
    assetIds() {
      return this.dialog.state.assetIds;
    },
    dialogHeader() {
      return this.$t('gddPage.createRef');
    },
    selectAssetWhere() {
      return {
        workspaceids:
          this.$getAppManager()
            .get(ProjectManager)
            .getWorkspaceIdByName('gdd') ?? null,
      };
    },
    selectedAsset(): AssetForSelection | null {
      if (this.targetAssetId) {
        const asset = this.$getAppManager()
          .get(CreatorAssetManager)
          .getAssetShortViaCacheSync(this.targetAssetId);
        if (asset)
          return {
            id: asset.id,
            title: asset.title,
            icon: asset.icon,
            name: asset.name,
          };
      }
      return null;
    },
  },
  async mounted() {},
  methods: {
    changeAsset(ev: ParentElement | null) {
      this.targetAssetId = ev?.id ?? null;
    },
    async choose(val?: boolean) {
      if (this.buttonIsPressed) return;
      if (val) {
        this.buttonIsPressed = true;
        const res = await this.$getAppManager()
          .get(UiManager)
          .doTask(async () => {
            const dialog_res: AssetReferencesResult[] = [];
            const reverse = this.dialog.state.reverse;
            if (this.targetAssetId) {
              const source_ids = reverse ? [this.targetAssetId] : this.assetIds;
              const target_ids = reverse ? this.assetIds : [this.targetAssetId];
              for (const target_id of target_ids) {
                const ref_res = await this.$getAppManager()
                  .get(CreatorAssetManager)
                  .createRef({
                    where: {
                      id: source_ids,
                    },
                    blockId: this.dialog.state.blockId,
                    targetAssetId: target_id,
                  });
                dialog_res.push(ref_res);
              }
            }
            this.dialog.close(dialog_res);
          });
        if (res.error) {
          this.buttonIsPressed = false;
        }
      } else {
        this.dialog.close();
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetRefsDialog {
  color: var(--local-text-color);
  font-size: var(--local-font-size);
  padding: 20px;
  width: 460px;
}

.AssetRefsDialog-header {
  font-weight: bold;
}

.AssetRefsDialog-select {
  margin: 14px 0;
}

.AssetRefsDialog-selectAsset {
  border: 1px solid #cccccc;
  border-radius: 4px;
  width: 100%;
}

.AssetRefsDialog-buttons {
  gap: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
}

.AssetRefsDialog-settings {
  padding-bottom: 10px;
}

.AssetRefsDialog-setting {
  display: flex;
  margin-bottom: 10px;
  font-size: var(--local-font-size);
  align-items: center;
}

.AssetRefsDialog-setting-name {
  min-width: 90px;
}

.AssetRefsDialog-setting-input {
  width: 100%;
}

.AssetRefsDialog-setting-flex {
  display: flex;
  align-items: center;

  & > .AssetRefsDialog-setting-input {
    margin-right: 10px;
  }
}

.AssetRefsDialog-setting-checkbox {
  margin-right: 10px;
}

.AssetRefsDialog-setting-checkbox-label {
  width: 100%;
  cursor: pointer;
}

.AssetRefsDialog-messages {
  font-style: italic;
  color: #999;
}
</style>

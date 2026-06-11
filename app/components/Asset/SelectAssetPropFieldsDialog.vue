<template>
  <dialog-content class="SelectAssetPropFieldsDialog" :loading="isLoading">
    <div v-if="loadError" class="Dialog-error">
      {{ loadError }}
    </div>
    <template v-else>
      <div v-if="!fields.length" class="SelectAssetPropFieldsDialog-field">
        <div class="SelectAssetPropFieldsDialog-field-caption">
          {{ $t('asset.fields.noFields') }}
        </div>
      </div>
      <div v-else class="Dialog-body">
        <div class="SelectAssetPropFieldsDialog-field">
          <div class="SelectAssetPropFieldsDialog-field-caption">
            {{ $t('asset.fields.selectFields') }}
          </div>
          <select-asset-combo-box
            v-if="dialog.state.showFilter"
            class="SelectAssetPropFieldsDialog-filter"
            :model-value="baseAsset"
            :where="selectAssetWhere"
            :select-base-asset="true"
            @update:model-value="selectBaseAsset"
          ></select-asset-combo-box>
          <div class="SelectAssetPropFieldsDialog-field-control">
            <div class="SelectAssetPropFieldsDialog-fields-list-item">
              <div
                class="SelectAssetPropFieldsDialog-fields-list-item-drag hidden"
              >
                <i class="ri-draggable"></i>
              </div>
              <div class="SelectAssetPropFieldsDialog-fields-list-item-field">
                <form-check-box
                  :caption="$t('common.dialogs.selectAll')"
                  :value="isAllSelected"
                  @input="selectAll"
                ></form-check-box>
              </div>
            </div>
            <sortable-list
              class="SelectAssetPropFieldsDialog-fields-list"
              :list="fields"
              :id-key="(item) => item.field.ref"
              handle-selector=".SelectAssetPropFieldsDialog-fields-list-item-drag"
              @update:list="changeList($event)"
            >
              <template #default="{ item }">
                <div class="SelectAssetPropFieldsDialog-fields-list-item">
                  <div
                    class="SelectAssetPropFieldsDialog-fields-list-item-drag"
                  >
                    <i class="ri-draggable"></i>
                  </div>
                  <div
                    class="SelectAssetPropFieldsDialog-fields-list-item-field"
                  >
                    <form-check-box
                      :caption="item.field.name"
                      :value="item.is_selected"
                      class="SelectAssetPropFieldsDialog-checkbox"
                      @input="item.is_selected = $event"
                    >
                      <div class="SelectAssetPropFieldsDialog-checkbox-caption">
                        <div
                          class="SelectAssetPropFieldsDialog-checkbox-caption-name"
                        >
                          <caption-string
                            v-if="renamingField !== item.field.ref"
                            :value="item.field.name"
                          ></caption-string>
                          <renamable-text
                            v-else
                            :is-renaming-mode-state="
                              renamingField === item.field.ref
                            "
                            :title="item.field.name"
                            :value="item.field.name"
                            :get-renaming-value="() => item.field.name"
                            :get-default-renaming-range="
                              getDefaultRenamingRange
                            "
                            @update:is-renaming-mode-state="
                              renamingField = null
                            "
                            @change="item.field.name = $event"
                          ></renamable-text>
                        </div>
                        <caption-string
                          class="SelectAssetPropFieldsDialog-checkbox-caption-title"
                          :value="item.field.title"
                        ></caption-string>
                      </div>
                    </form-check-box>
                  </div>
                  <div
                    class="SelectAssetPropFieldsDialog-fields-list-item-manage"
                  >
                    <button
                      class="is-button is-button-icon-outlined SelectAssetPropFieldsDialog-fields-list-item-manage-edit"
                      @click="renamingField = item.field.ref"
                    >
                      <i class="ri-pencil-fill"></i>
                    </button>
                  </div>
                </div>
              </template>
            </sortable-list>
          </div>
        </div>
      </div>
    </template>
    <div class="Form-row-buttons">
      <div class="Form-row-buttons-center use-buttons-action">
        <button type="button" class="is-button" @click="dialog.close()">
          {{ $t('common.dialogs.cancel') }}
        </button>
        <button
          v-if="!loadError"
          type="button"
          :disabled="!fields.length"
          class="is-button accent JsonConfigurationPreviewDialog-button-ok"
          @click="save"
        >
          {{ $t('common.dialogs.ok') }}
        </button>
      </div>
    </div>
  </dialog-content>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../Dialog/DialogContent.vue';
import type { DialogInterface } from '../../logic/managers/DialogManager';
import FormCheckBox from '../Form/FormCheckBox.vue';
import SortableList from '../Common/SortableList.vue';
import CaptionString from '../Common/CaptionString.vue';
import RenamableText from '../Common/RenamableText.vue';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import ProjectManager from '../../logic/managers/ProjectManager';
import type { AssetFullInstanceR } from '../../logic/types/AssetFullInstance';
import EditorManager from '../../logic/managers/EditorManager';
import { BLOCK_NAME_META } from '../../logic/constants';
import {
  getAssetPropFieldRef,
  type AssetPropField,
} from './SelectAssetPropFields';
import SelectAssetComboBox from './SelectAssetComboBox.vue';
import type { AssetPropWhere } from '../../logic/types/PropsWhere';
import type { AssetForSelection } from '../../logic/types/AssetsType';

type AssetPropFieldWithSelected = {
  is_selected: boolean;
  field: AssetPropField;
};

type DialogProps = {
  assetId: string | null;
  fields: AssetPropField[];
  baseFieldsOnly?: boolean;
  showFilter?: boolean;
};

type DialogResult = {
  fields: AssetPropField[];
} | null;

export default defineComponent({
  name: 'SelectAssetPropFieldsDialog',
  components: {
    DialogContent,
    FormCheckBox,
    SortableList,
    CaptionString,
    RenamableText,
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
      fields: [
        ...this.dialog.state.fields.map((el) => {
          return {
            field: el,
            is_selected: true,
          };
        }),
      ] as AssetPropFieldWithSelected[],
      isLoading: false,
      loadError: null as string | null,
      asset: null as AssetFullInstanceR | null,
      renamingField: null as string | null,
      baseAsset: null as null | AssetForSelection,
    };
  },
  computed: {
    isAllSelected() {
      return !this.fields.some((el) => el.is_selected === false);
    },
    selectAssetWhere(): AssetPropWhere {
      const res: AssetPropWhere = {
        workspaceids:
          this.$getAppManager()
            .get(ProjectManager)
            .getWorkspaceIdByName('gdd') ?? null,
      };
      return res;
    },
  },
  async mounted() {
    await this.load();
  },
  methods: {
    async selectBaseAsset(val: AssetForSelection | null) {
      this.baseAsset = val;
      await this.load(val?.id, true);
    },
    selectAll(val: boolean) {
      this.fields.map((el) => (el.is_selected = val));
    },
    getDefaultRenamingRange(str: string) {
      return {
        from: 0,
        to: str.length,
      };
    },
    async changeList(reordered_fields: AssetPropFieldWithSelected[]) {
      this.fields = reordered_fields;
    },
    async save() {
      this.dialog.close({
        fields: this.fields.reduce((res, field) => {
          if (field.is_selected) res.push(field.field);
          return res;
        }, [] as AssetPropField[]),
      });
    },
    async load(asset_id?: string, reload?: boolean) {
      this.isLoading = true;
      this.loadError = null;
      try {
        if (reload) {
          this.fields = [];
        }
        const base_asset_id = asset_id ?? this.dialog.state.assetId;

        const base_fields = [
          {
            is_selected: false,
            field: {
              ref: 'id',
              title: 'ID',
              name: 'id',
            },
          },
          {
            is_selected: false,
            field: {
              ref: 'title',
              title: '[[t:Title]]',
              name: 'title',
            },
          },
        ];

        for (const base_field of base_fields) {
          if (this.fields.some((el) => el.field.ref === base_field.field.ref)) {
            continue;
          }
          this.fields.push(base_field);
        }

        if (!base_asset_id) {
          return;
          // const gdd_workspace_id = this.$getAppManager()
          //   .get(ProjectManager)
          //   .getWorkspaceIdByName('gdd');

          // this.asset = (
          //   await this.$getAppManager()
          //     .get(CreatorAssetManager)
          //     .getAssetInstancesList({
          //       where: { workspaceids: gdd_workspace_id },
          //     })
          // ).list[0];
        } else {
          this.asset = await this.$getAppManager()
            .get(CreatorAssetManager)
            .getAssetInstance(base_asset_id);
        }
        if (!this.asset) return;

        if (this.dialog.state.baseFieldsOnly) {
          return;
        }

        for (const block of this.asset.blocks) {
          if (block.name === BLOCK_NAME_META) {
            continue;
          }
          const current_block_controller = this.$getAppManager()
            .get(EditorManager)
            .getBlockTypesMap()[block.type];
          if (!current_block_controller) {
            continue;
          }
          const block_variables =
            current_block_controller.getBlockProvidedVariables(
              this.asset,
              {
                ...block,
                rights: this.asset.rights,
                references: [],
              },
              this.$getAppManager(),
            );
          for (const variable of block_variables) {
            const ref = getAssetPropFieldRef({
              block_name: variable.blockName,
              block_id: variable.blockId,
              prop_key: variable.field.propKey,
            });
            console.log(ref);
            if (this.fields.some((item) => item.field.ref === ref)) {
              continue;
            }
            this.fields.push({
              field: {
                ref,
                title: variable.title,
                name: variable.name,
                type: variable.dataType,
              },
              is_selected: false,
            });
          }
        }
      } catch (err: any) {
        this.loadError = err.message;
      } finally {
        this.isLoading = false;
      }
    },
  },
});
</script>
<style lang="scss" scoped>
@use '$style/Form';

.SelectAssetPropFieldsDialog {
  width: 350px;
}
.SelectAssetPropFieldsDialog-field-caption {
  text-align: center;
  margin-bottom: 5px;
  position: relative;
  padding: 0px 20px;
}
.SelectAssetPropFieldsDialog-fields-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.SelectAssetPropFieldsDialog-fields-list-item {
  display: flex;
  align-items: center;

  .SelectAssetPropFieldsDialog-fields-list-item-drag {
    flex-shrink: 0;
    font-size: 15px;
    color: var(--local-sub-text-color);
    cursor: grab;

    &.hidden {
      opacity: 0;
      visibility: 0;
      cursor: default;
    }
  }

  .SelectAssetPropFieldsDialog-fields-list-item-field {
    flex: 1;
    overflow: hidden;
    width: 100%;
    white-space: nowrap;
    text-overflow: ellipsis;

    .SelectAssetPropFieldsDialog-checkbox-caption {
      display: flex;
      flex-direction: column;

      .SelectAssetPropFieldsDialog-checkbox-caption-title {
        font-size: 12px;
        line-height: 1;
        color: var(--local-sub-text-color);
      }
    }
  }
  .SelectAssetPropFieldsDialog-fields-list-item-manage {
    display: flex;
    flex-shrink: 0;
  }
}
.SelectAssetPropFieldsDialog-field {
  margin-bottom: 10px;
}
.SelectAssetPropFieldsDialog-filter {
  margin-bottom: 10px;
}
</style>

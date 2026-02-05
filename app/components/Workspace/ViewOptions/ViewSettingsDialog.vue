<template>
  <dialog-content
    class="ViewSettingsDialog"
    :loading="isLoading"
    @escape-press="dialog.close()"
  >
    <div class="Dialog-header ViewSettingsDialog-header">
      {{ dialogHeader }}
    </div>
    <div v-if="loadError" class="Dialog-error">
      {{ loadError }}
    </div>
    <template v-else>
      <div class="ViewSettingsDialog-settings">
        <div class="ViewSettingsDialog-setting">
          <div class="ViewSettingsDialog-setting-name">
            {{ $t('viewSettings.viewTitle') }}:
          </div>
          <ims-input
            :model-value="viewTitle"
            type="text"
            @change="makeNameUnique($event)"
          ></ims-input>
        </div>
        <div class="ViewSettingsDialog-setting">
          <div class="ViewSettingsDialog-setting-name">
            {{ $t('viewSettings.viewType') }}:
          </div>
          <value-switcher
            v-model="selectedViewType"
            :options="viewTypes"
            label-prop="title"
            value-prop="type"
          >
            <template #option="{ option }">
              <caption-string :value="option.title"> </caption-string>
            </template>
          </value-switcher>
        </div>
      </div>
      <div class="Form-row-buttons">
        <div
          class="Form-row-buttons-center SelectRoleDialog-buttons use-buttons-action"
        >
          <button
            v-if="dialog.state.view"
            class="is-button danger"
            @click="deleteView()"
          >
            {{ $t('common.dialogs.delete') }}
          </button>
          <button class="is-button" @click="choose()">
            {{ $t('common.dialogs.cancelCaption') }}
          </button>
          <button class="is-button accent" @click="choose(true)">
            {{ dialog.state.buttonTitle }}
          </button>
        </div>
      </div>
    </template>
  </dialog-content>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../../Dialog/DialogContent.vue';
import ValueSwitcher from '../../Common/ValueSwitcher.vue';
import ImsInput from '../../Common/ImsInput.vue';
import CaptionString from '../../Common/CaptionString.vue';
import ConfirmDialog from '../../Common/ConfirmDialog.vue';
import type { DialogInterface } from '../../../logic/managers/DialogManager';
import DialogManager from '../../../logic/managers/DialogManager';
import UiManager from '../../../logic/managers/UiManager';
import { normalizeAssetPropPart } from '../../../logic/types/Props';
import { convertTranslatedTitle } from '../../../logic/utils/assets';
import { generateNextUniqueNameNumber } from '../../../logic/utils/stringUtils';
import type { UserView } from './viewUtils';
import { ViewType, VIEW_TYPES, VIEW_TYPES_MAP } from './viewUtils';

type DialogProps = {
  header: string;
  buttonTitle: string;
  view?: UserView;
  allViews: UserView[];
};

type DialogResult = {
  title: string;
  type: ViewType;
  needDelete?: boolean;
};

export default defineComponent({
  name: 'ViewSettingsDialog',
  components: {
    DialogContent,
    ValueSwitcher,
    ImsInput,
    CaptionString,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  emits: ['dialog-parameters'],
  data() {
    return {
      isLoading: false,
      loadError: null as string | null,
      selectedViewType: ViewType.TABLE,
      viewTitle: 'View',
    };
  },
  computed: {
    dialogHeader() {
      return this.dialog.state.header;
    },
    viewTypes() {
      return VIEW_TYPES;
    },
  },
  watch: {
    selectedViewType() {
      if (!this.dialog.state.view) {
        this.generateNewName();
      }
    },
  },
  mounted() {
    this.$emit('dialog-parameters', {
      forbidClose: true,
    });
    this.load();
  },
  methods: {
    generateNewName() {
      const new_title = convertTranslatedTitle(
        VIEW_TYPES_MAP[this.selectedViewType].title ?? 'View',
        (key) => this.$t(key),
      );
      this.makeNameUnique(new_title);
    },
    makeNameUnique(new_title: string) {
      new_title = (new_title ?? '').trim();
      if (!new_title) new_title = 'Untitled';
      this.viewTitle = generateNextUniqueNameNumber(
        new_title,
        (title) =>
          this.dialog.state.allViews.every(
            (v) =>
              v.key !== normalizeAssetPropPart(title) ||
              v === this.dialog.state.view,
          ),
        ' ',
      );
    },
    load() {
      try {
        this.isLoading = true;
        this.loadError = null;
        if (this.dialog.state.view) {
          this.viewTitle = this.dialog.state.view.title;
          this.selectedViewType = this.dialog.state.view.type;
        } else {
          this.generateNewName();
        }
      } catch (err: any) {
        this.loadError = err.message;
      } finally {
        this.isLoading = false;
      }
    },
    async deleteView() {
      const answer = await this.$getAppManager()
        .get(DialogManager)
        .show(ConfirmDialog, {
          header: this.$t('viewSettings.deleteView') + '?',
          message: this.$t('viewSettings.deleteViewConfirm'),
          yesCaption: this.$t('common.dialogs.delete'),
          danger: true,
        });
      if (answer && this.dialog.state.view) {
        this.dialog.close({
          title: this.viewTitle,
          type: this.selectedViewType,
          needDelete: true,
        });
      }
    },
    async choose(val?: boolean) {
      if (val) {
        if (!this.viewTitle || this.viewTitle.length === 0) {
          this.$getAppManager()
            .get(UiManager)
            .showError(this.$t('fields.allFieldsMustBeFulled'));
          return;
        }
        this.dialog.close({
          title: this.viewTitle,
          type: this.selectedViewType,
        });
      } else {
        this.dialog.close();
      }
    },
  },
});
</script>
<style lang="scss" scoped>
.ViewSettingsDialog-setting {
  display: flex;
  margin-bottom: 10px;
  font-size: var(--local-font-size);
  align-items: center;
}

.ViewSettingsDialog-setting-name {
  min-width: 120px;
}
</style>

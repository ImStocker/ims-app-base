<template>
  <dialog-content @escape-press="close()" @enter-press="close()">
    <div class="ProjectExportSettingsDialog">
      <div class="ProjectExportSettingsDialog-header">
        {{ $t('importExport.exportSettingsTitle') }}
      </div>
      <div class="ProjectExportSettingsDialog-content">
        <FormCheckBox
          v-for="item in Object.keys(exportSettingsPreference)"
          :key="item"
          :value="isSelected(item as any)"
          @input="selectSetting(item as any)"
        >
          {{ $t('importExport.exportSettings.' + item) }}
        </FormCheckBox>
      </div>
    </div>
  </dialog-content>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../Dialog/DialogContent.vue';
import FormCheckBox from '../Form/FormCheckBox.vue';
import UiPreferenceManager from '../../logic/managers/UiPreferenceManager';
import {
  DEFAULT_PROJECT_EXPORT_SETTINGS,
  type ExportProjectParams,
} from '../../logic/types/ProjectTypes';
import type { DialogInterface } from '../../logic/managers/DialogManager';

type DialogProps = {};

type DialogResult = undefined;

export default defineComponent({
  name: 'ProjectExportSettingsDialog',
  components: {
    DialogContent,
    FormCheckBox,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  emits: ['dialog-parameters'],
  computed: {
    exportSettingsPreference: {
      get(): ExportProjectParams {
        return this.$getAppManager()
          .get(UiPreferenceManager)
          .getPreference(
            'ProjectExportSettings.settings',
            DEFAULT_PROJECT_EXPORT_SETTINGS,
          );
      },
      set(val: ExportProjectParams[]) {
        this.$getAppManager()
          .get(UiPreferenceManager)
          .setPreference('ProjectExportSettings.settings', val);
      },
    },
  },
  methods: {
    close() {
      this.dialog.close();
    },
    isSelected(item: keyof ExportProjectParams) {
      return this.exportSettingsPreference[item];
    },
    selectSetting(item: keyof ExportProjectParams) {
      const export_params_copy = { ...this.exportSettingsPreference };
      export_params_copy[item] = !export_params_copy[item];
      this.exportSettingsPreference = export_params_copy;
    },
  },
});
</script>
<style lang="scss" scoped>
.ProjectExportSettingsDialog {
  width: 500px;
  max-width: 500px;
}

.ProjectExportSettingsDialog-header {
  font-family: var(--local-font-family);
  font-size: 24px;
  text-align: center;
  color: var(--color-accent);
  padding-bottom: 20px;
  font-weight: bold;
}

.ProjectExportSettingsDialog-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 20px;
}
</style>

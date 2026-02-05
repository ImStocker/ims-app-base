<template>
  <dialog-content @escape-press="close()" @enter-press="close()">
    <div class="ProjectExportDialog">
      <div class="Form">
        <div class="ProjectExportDialog-header">
          {{ $t('importExport.exportProjectDialogHeader') }}
        </div>
        <div class="ProjectExportDialog-content">
          <div class="ProjectExportDialog-content-message">
            {{ $t('importExport.exportProjectDialogMessage') }}:
          </div>
          <div class="ImportExport-content-settings">
            <div
              v-for="export_setting of exportSettings"
              :key="export_setting.key"
            >
              <FormCheckBox
                :value="checkSetting(export_setting.value)"
                @input="selectExportSettings(export_setting.value)"
              >
                {{ $t('importExport.exportSettings.' + export_setting.key) }}
              </FormCheckBox>
            </div>
          </div>
          <div v-if="error" class="error-message-block">
            {{ error }}
          </div>
        </div>
        <div class="Form-row-buttons">
          <div
            class="ProjectExportDialog-buttons-center Form-row-buttons-center"
          >
            <button class="is-button" :disabled="loading" @click="close()">
              {{ $t('common.dialogs.close') }}
            </button>
            <button
              v-if="loading"
              class="is-button accent-outline ImportExport-loadButton"
            >
              <div class="loaderSpinner ImportExport-loadButton-circle" />
              <span class="personal-account-editLink">
                {{ $t('importExport.export') }}...
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </dialog-content>
</template>

<script type="text/ecmascript-6" lang="ts">
import DialogContent from '../Dialog/DialogContent.vue';
import { defineComponent, type PropType } from 'vue';
import ProjectManager from '../../logic/managers/ProjectManager';
import FormCheckBox from '../Form/FormCheckBox.vue';
import type { DialogInterface } from '../../logic/managers/DialogManager';

type DialogProps = {};

type DialogResult = undefined;

export default defineComponent({
  name: 'ProjectExportDialog',
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
  data() {
    return {
      loading: false,
      error: null as string | null,
      activeExportSettings: ['default', 'tasks', 'configuration', 'settings'],
    };
  },
  computed: {
    projectId() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo()?.id;
    },
    exportSettings() {
      return [
        {
          key: 'gdd',
          value: ['default'],
        },
        {
          key: 'tasks',
          value: ['tasks'],
        },
        {
          key: 'settings',
          value: ['configuration', 'settings'],
        },
      ];
    },
  },
  async mounted() {
    this.$emit('dialog-parameters', {
      forbidClose: true,
    });
  },
  methods: {
    // async exportProject(){
    //     this.loading = true;
    //     try{
    //         this.error = null;
    //         if(this.activeExportSettings.length){
    //             await this.$getAppManager().get(ProjectManager).exportProject({
    //                 where: {
    //                     scope: [...this.activeExportSettings]
    //                 }
    //             })
    //         }
    //         else {
    //             throw new Error('Need select export setting');
    //         }
    //     }
    //     catch(err: any){
    //         this.error = err.message.toString();
    //     }
    //     finally{
    //         this.loading = false;
    //     }
    // },
    checkSetting(settings: string[]) {
      for (const setting of settings) {
        if (this.activeExportSettings.find((s) => s === setting)) {
          return true;
        }
      }
      return false;
    },
    selectExportSettings(settings: string[]) {
      for (const setting of settings) {
        const ind = this.activeExportSettings.findIndex((s) => s === setting);
        if (ind > -1) {
          this.activeExportSettings.splice(ind, 1);
        } else {
          this.activeExportSettings.push(setting);
        }
      }
    },
    close() {
      this.dialog.close();
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins.scss';

.ProjectExportDialog-content {
  margin-bottom: 20px;
  width: 500px;

  @include devices-mixins.device-type(not-pc) {
    width: 100%;
  }
}

.button-yellow {
  @include devices-mixins.device-type(not-pc) {
    // padding: 5px 10px 6px;
  }
}

.ProjectExportDialog-header {
  margin-bottom: 20px;
  font-weight: bold;
  text-align: center;
}

.ProjectExportDialog-content-message {
  margin-bottom: 10px;
}

.ProjectExportDialog-loader {
  display: flex;
  justify-content: center;
  align-items: center;
}

.ProjectExportDialog-loaderSpinner {
  margin: 5px;
}

.ProjectExportDialog-buttons-center {
  display: flex;
  justify-content: center;
  align-items: center;

  @include devices-mixins.device-type(not-pc) {
    display: block;
  }
}
</style>

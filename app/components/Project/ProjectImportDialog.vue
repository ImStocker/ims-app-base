<template>
  <dialog-content @escape-press="close()" @enter-press="close()">
    <div class="ProjectImportDialog">
      <div class="Form">
        <div class="ProjectImportDialog-header">
          {{ $t('importExport.importProjectDialogHeader') }}
        </div>
        <div class="ProjectImportDialog-content">
          <div v-if="importing" class="ProjectImportDialog-content-message">
            {{ $t('importExport.importProjectDialogMessage') }}

            <div class="ProjectImportDialog-loader">
              <span class="loaderSpinner ProjectImportDialog-loaderSpinner" />
              {{ $t('importExport.import') }}...
            </div>
          </div>
          <div v-if="error" class="error-message-block">
            {{ error }}
          </div>
          <div v-if="importResult">
            <div v-for="result_prop of importResultProps" :key="result_prop">
              {{ $t('importExport.importResult.' + result_prop) }}:
              {{ (importResult as any)[result_prop] }}
            </div>
            <div v-if="importResult.logs.length > 0">
              {{ $t('importExport.importResult.logs') }}:
              <div class="ProjectImportDialog-logs is-panel">
                <div
                  v-for="result_log of importResult.logs"
                  :key="result_log.text"
                  class="ProjectImportDialog-logs-one"
                >
                  <span
                    :class="{
                      'import-error': result_log.level === 'error',
                      'import-warn': result_log.level === 'warn',
                    }"
                    >{{ result_log.text }}</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="Form-row-buttons">
          <div class="Form-row-buttons-center">
            <button class="is-button" :disabled="importing" @click="close()">
              {{ $t('common.dialogs.close') }}
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
import type { ProjectImportResponseDTO } from '../../logic/types/ProjectTypes';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import type { DialogInterface } from '../../logic/managers/DialogManager';

type DialogProps = {
  files: File[];
  workspaceId?: string | null;
};

type DialogResult = undefined;

export default defineComponent({
  name: 'ProjectImportDialog',
  components: {
    DialogContent,
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
      importing: true,
      importResult: null as ProjectImportResponseDTO | null,
      error: null as string | null,
    };
  },
  computed: {
    projectId() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo()?.id;
    },
    importResultProps() {
      return Object.keys(this.importResult ?? {}).filter((pr) => pr !== 'logs');
    },
  },
  async mounted() {
    this.$emit('dialog-parameters', {
      forbidClose: true,
    });
    await this.importFile();
  },
  methods: {
    async importFile() {
      this.importing = true;
      try {
        this.error = null;
        this.importResult = null;

        for (const file of this.dialog.state.files) {
          const one_res = await this.$getAppManager()
            .get(ProjectManager)
            .importFile(file, file.name, this.dialog.state.workspaceId);
          if (!this.importResult) {
            this.importResult = {
              createdAssets: 0,
              createdWorkspaces: 0,
              updatedAssets: 0,
              updatedWorkspaces: 0,
              logs: [],
            };
          }
          this.importResult.createdAssets += one_res.createdAssets;
          this.importResult.createdWorkspaces += one_res.createdWorkspaces;
          this.importResult.updatedAssets += one_res.updatedAssets;
          this.importResult.updatedWorkspaces += one_res.updatedWorkspaces;
          this.importResult.logs = [...this.importResult.logs, ...one_res.logs];
        }

        this.$getAppManager().get(CreatorAssetManager).reloadSubscriber.notify({
          workspaceId: this.dialog.state.workspaceId,
        });
      } catch (err: any) {
        this.error = err.message.toString();
      } finally {
        this.importing = false;
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

.ProjectImportDialog-content {
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

.ProjectImportDialog-header {
  margin-bottom: 20px;
  font-weight: bold;
  text-align: center;
}

.ProjectImportDialog-content-message {
  text-align: center;
  margin-bottom: 20px;
}

.ProjectImportDialog-logs {
  max-height: 200px;
  overflow: auto;

  &::-webkit-scrollbar {
    background-color: transparent;

    @include devices-mixins.device-type(not-pc) {
      width: 15px;
      height: 15px;
    }

    @include devices-mixins.device-type(pc) {
      width: 6px;
      height: 6px;
    }
  }

  &::-webkit-scrollbar-thumb {
    background-color: #ccc;
    border-radius: 8px;
  }
}

.import-error {
  color: var(--color-main-error);
}

.import-warn {
  color: var(--color-main-yellow);
}

.ProjectImportDialog-loader {
  display: flex;
  justify-content: center;
  align-items: center;
}

.ProjectImportDialog-loaderSpinner {
  margin: 5px;
}

.ProjectImportDialog-logs-one {
  margin-bottom: 10px;
}
</style>

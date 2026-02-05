<template>
  <dialog-content class="SetUpAccessDialog" :loading="isLoading">
    <div class="Form">
      <div class="Dialog-header">
        {{ $t('gddPage.setUpAccess') }}
      </div>
      <div class="Dialog-message SetUpAccessDialog-roles">
        <div
          v-for="project_right of currentRights"
          :key="project_right.roleNum"
          class="SetUpAccessDialog-role"
        >
          <div
            class="SetUpAccessDialog-role-title"
            :class="{
              'SetUpAccessDialog-role-current':
                currentUserRole?.num === project_right.roleNum,
            }"
          >
            <caption-string
              :value="
                project_right.roleNum === 0
                  ? $t('setUpAccessDialog.anyoneWhoHasLink')
                  : roles[project_right.roleNum].title
              "
            ></caption-string>
          </div>
          <div class="SetUpAccessDialog-role-settings">
            <ims-select
              v-pro-function="
                project_right.roleNum !== 0 ? 'roleSettings' : undefined
              "
              :model-value="project_right.ownRights"
              :options="rightOptions"
              :clearable="false"
              :disabled="currentUserRole?.num === project_right.roleNum"
              :get-option-label="
                (opt: any) => $t('setUpAccessDialog.' + opt.Title)
              "
              :placeholder="
                $t(
                  'setUpAccessDialog.' +
                    getLabel(project_right.inheritedRights),
                )
              "
              :get-option-key="(opt: any) => opt.Value"
              :reduce="(opt: any) => opt.Value"
              class="SetUpAccessDialog-role-settings-select"
              @update:model-value="addChange(project_right.roleNum, $event)"
            ></ims-select>
            <div
              v-if="project_right.ownRights === null"
              class="use-buttons-options"
            >
              <button
                v-pro-function="
                  project_right.roleNum !== 0 ? 'roleSettings' : undefined
                "
                class="is-button"
                disabled
                :title="
                  project_right.type === 'workspace'
                    ? $t('setUpAccessDialog.rightsInheritedParent')
                    : $t('setUpAccessDialog.rightsDefault')
                "
              >
                <i class="ri-node-tree"></i>
              </button>
            </div>
            <div v-else class="use-buttons-options">
              <button
                class="is-button"
                @click="deleteChange(project_right.roleNum)"
              >
                <i class="ri-close-fill"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="Form-row-buttons SetUpAccessDialog-buttons">
        <div class="Form-row-buttons-left use-buttons-action">
          <button
            type="button"
            class="is-button"
            :title="$t('asset.copyLink')"
            @click="copyLink()"
          >
            <i class="ri-file-copy-line"></i>
            {{ $t('asset.copyLink') }}
          </button>
        </div>
        <div class="Form-row-buttons-center"></div>
        <div
          class="Form-row-buttons-right SetUpAccessDialog-buttons use-buttons-action"
        >
          <button
            type="button"
            :value="$t('common.dialogs.cancelCaption')"
            class="is-button"
            :disabled="busy"
            @click="dialog.close()"
          >
            {{ $t('common.dialogs.cancelCaption') }}
          </button>
          <button
            type="button"
            class="is-button accent"
            :class="{ loading: busy }"
            @click="save()"
          >
            {{ $t('common.dialogs.save') }}
          </button>
        </div>
      </div>
    </div>
  </dialog-content>
</template>

<script lang="ts" type="text/ecmascript-6">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../../Dialog/DialogContent.vue';
import type { DialogInterface } from '../../../logic/managers/DialogManager';
import ProjectManager from '../../../logic/managers/ProjectManager';
import TaskManager from '../../../logic/managers/TaskManager';
import UiManager from '../../../logic/managers/UiManager';
import { getProjectLinkHref } from '../../../logic/router/routes-helpers';
import { clipboardCopyPlainText } from '../../../logic/utils/clipboard';
import type {
  ProjectFullRole,
  ProjectRightsInspectResponseRoleDTO,
} from '../../../logic/types/RightsAndRoles';
import { ProjectRightsInspectResponseRightType } from '../../../logic/types/RightsAndRoles';
import ImsSelect from '../../Common/ImsSelect.vue';
import CaptionString from '../../Common/CaptionString.vue';
import { AssetRights } from '../../../logic/types/Rights';

type DialogProps = {
  assetId?: string;
  workspaceId?: string;
};

type DialogResult = boolean | undefined | null;

export default defineComponent({
  name: 'SetUpAccessDialog',
  components: {
    DialogContent,
    ImsSelect,
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
      initialRights: [] as ProjectRightsInspectResponseRoleDTO[],
      isLoading: true,
      busy: false,
      roles: {} as { [roleNum: string]: ProjectFullRole },
      changes: [] as {
        roleNum: number;
        rights: AssetRights | null;
      }[],
    };
  },
  computed: {
    rightOptions() {
      return [
        {
          Value: AssetRights.NO,
          Title: 'hidden',
        },
        {
          Value: AssetRights.READ_ONLY,
          Title: 'readOnly',
        },
        {
          Value: AssetRights.COMMENT,
          Title: 'comment',
        },
        {
          Value: AssetRights.FULL_ACCESS,
          Title: 'fullAccess',
        },
      ];
    },
    currentUserRole() {
      return this.$getAppManager().get(ProjectManager).getUserRoleInProject();
    },
    currentRights() {
      const res = new Map<
        number,
        {
          roleNum: number;
          inheritedRights: AssetRights;
          type: ProjectRightsInspectResponseRightType;
          ownRights: AssetRights | null;
        }
      >();

      for (const right of this.initialRights) {
        if (right.type === ProjectRightsInspectResponseRightType.OWN) {
          continue;
        }
        res.set(right.roleNum, {
          roleNum: right.roleNum,
          inheritedRights: right.rights,
          type: right.type,
          ownRights: null,
        });
      }

      for (const right of this.initialRights) {
        if (right.type !== ProjectRightsInspectResponseRightType.OWN) {
          continue;
        }

        const rec = res.get(right.roleNum);
        if (!rec) {
          continue;
        }

        rec.ownRights = right.rights;
      }

      for (const change of this.changes) {
        const rec = res.get(change.roleNum);
        if (!rec) {
          continue;
        }
        rec.ownRights = change.rights;
      }

      return [...res.values()];
    },
  },
  async mounted() {
    this.isLoading = true;
    this.$emit('dialog-parameters', {
      forbidClose: true,
    });
    const res = await this.$getAppManager()
      .get(ProjectManager)
      .getRights(this.dialog.state.assetId, this.dialog.state.workspaceId);
    if (res) {
      this.initialRights = res.roleRights;
      this.roles = res.objects.roles;
    }

    this.isLoading = false;
  },
  methods: {
    getLabel(rights: AssetRights) {
      return this.rightOptions.find((r) => r.Value === rights)?.Title;
    },
    async copyLink() {
      try {
        const projectInfo = this.$getAppManager()
          .get(ProjectManager)
          .getProjectInfo();
        let link = '';
        if (projectInfo && this.dialog.state.assetId) {
          const taskNum = this.$getAppManager()
            .get(TaskManager)
            .getTaskViaCacheSync(this.dialog.state.assetId)?.num;
          link = getProjectLinkHref(
            this.$router,
            projectInfo,
            taskNum
              ? {
                  name: 'project-tasks-task',
                  params: {
                    taskNum: taskNum,
                  },
                }
              : {
                  name: 'project-asset-by-id',
                  params: {
                    assetId: this.dialog.state.assetId,
                  },
                },
            true,
          );
        }
        if (projectInfo && this.dialog.state.workspaceId) {
          link = getProjectLinkHref(
            this.$router,
            projectInfo,
            {
              name: 'project-workspace-by-id',
              params: {
                workspaceId: this.dialog.state.workspaceId,
              },
            },
            true,
          );
        }
        await clipboardCopyPlainText(link);
        this.$getAppManager()
          .get(UiManager)
          .showSuccess(this.$t('asset.linkCopied'));
      } catch (e) {
        console.error(e);
        this.$getAppManager().get(UiManager).showError(e);
      }
    },
    addChange(role_num: number, new_rights: AssetRights) {
      const ind = this.changes.findIndex((ch) => ch.roleNum === role_num);
      if (ind > -1) {
        this.changes[ind].rights = new_rights;
      } else {
        this.changes.push({
          roleNum: role_num,
          rights: new_rights,
        });
      }
    },
    deleteChange(role_num: number) {
      const ind = this.changes.findIndex((ch) => ch.roleNum === role_num);
      if (ind > -1) {
        this.changes.splice(ind, 1);
      } else {
        this.changes.push({
          roleNum: role_num,
          rights: null,
        });
      }
    },
    async save() {
      this.busy = true;
      try {
        if (this.dialog.state.workspaceId) {
          const workspace_id = this.dialog.state.workspaceId;
          await this.$getAppManager()
            .get(ProjectManager)
            .setWorkspaceRoleRightsList(
              this.changes.map((rs) => {
                return {
                  workspaceId: workspace_id,
                  roleNum: rs.roleNum,
                  rights: rs.rights,
                };
              }),
            );
        }
        if (this.dialog.state.assetId) {
          const asset_id = this.dialog.state.assetId;
          await this.$getAppManager()
            .get(ProjectManager)
            .setAssetRoleRightsList(
              this.changes.map((rs) => {
                return {
                  assetId: asset_id,
                  roleNum: rs.roleNum,
                  rights: rs.rights,
                };
              }),
            );
        }
        this.dialog.close();
        this.$getAppManager()
          .get(UiManager)
          .showSuccess(this.$t('setUpAccessDialog.settingsSaved'));
      } catch (err) {
        this.$getAppManager().get(UiManager).showError(err);
      } finally {
        this.busy = false;
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/Form';
.SetUpAccessDialog-roles {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.SetUpAccessDialog-role {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 25px;
}
.SetUpAccessDialog-role-settings-select {
  min-width: 180px;
}
.SetUpAccessDialog-role-current {
  font-weight: bold;
}
.SetUpAccessDialog-role-settings {
  display: flex;
  align-items: center;
  gap: 5px;
}
.SetUpAccessDialog-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}
</style>

<template>
  <dialog-content class="SetUpNotificationsDialog" :loading="isLoading">
    <div class="Form">
      <div class="Dialog-header">
        {{ $t('gddPage.setUpNotifications') }}
      </div>
      <div class="Dialog-message SetUpNotificationsDialog-roles">
        <div v-if="isAdmin">
          <ValueSwitcher
            v-model="openedTabName"
            class="FastCreateTasksWorkspaceDialog-Types"
            :options="tabs"
            value-prop="name"
            label-prop="title"
          />
        </div>
        <div v-if="openedTabName === 'my'">
          <div class="SetUpNotificationsDialog-setting">
            <div class="SetUpNotificationsDialog-setting-title">
              {{ $t('setUpNotificationDialog.notifyAboutChanges') }}
            </div>
            <form-ims-toggle-with-settings
              v-if="myRights"
              :project-right="myRights"
              :model-value="notifyAboutChanges"
              @update:model-value="notifyAboutChanges = $event"
            ></form-ims-toggle-with-settings>
          </div>
          <div class="SetUpNotificationsDialog-setting">
            <div class="SetUpNotificationsDialog-setting-title">
              {{ $t('setUpNotificationDialog.notifyAboutComments') }}
            </div>
            <form-ims-toggle-with-settings
              v-if="myRights"
              :project-right="myRights"
              :model-value="notifyAboutComments"
              @update:model-value="notifyAboutComments = $event"
            ></form-ims-toggle-with-settings>
          </div>
        </div>
        <div v-else-if="openedTabName === 'roles'">
          <table>
            <thead>
              <tr>
                <th class="SetUpNotificationsDialog-roles-th">
                  {{ $t('setUpNotificationDialog.notifications') }}
                </th>
                <th class="SetUpNotificationsDialog-roles-th">
                  {{ $t('setUpNotificationDialog.changes') }}
                </th>
                <th class="SetUpNotificationsDialog-roles-th">
                  {{ $t('setUpNotificationDialog.comments') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="project_right of currentRights"
                :key="project_right.roleNum"
              >
                <th class="SetUpNotificationsDialog-roles-th">
                  <caption-string
                    :value="
                      project_right.roleNum === 0
                        ? $t('setUpAccessDialog.anyoneWhoHasLink')
                        : roles[project_right.roleNum].title
                    "
                  ></caption-string>
                </th>
                <th>
                  <form-ims-toggle-with-settings
                    v-if="myRights"
                    :project-right="myRights"
                    :model-value="notifyAboutChanges"
                    @update:model-value="notifyAboutChanges = $event"
                  ></form-ims-toggle-with-settings>
                </th>
                <th>
                  <form-ims-toggle-with-settings
                    v-if="myRights"
                    :project-right="myRights"
                    :model-value="notifyAboutComments"
                    @update:model-value="notifyAboutComments = $event"
                  ></form-ims-toggle-with-settings>
                </th>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="Form-row-buttons SetUpNotificationsDialog-buttons">
        <div class="Form-row-buttons-center">
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
            class="is-button is-button-action accent"
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
import UiManager from '../../../logic/managers/UiManager';
import type {
  ProjectFullRole,
  ProjectRightsInspectResponseRoleDTO,
} from '../../../logic/types/RightsAndRoles';
import { ProjectRightsInspectResponseRightType } from '../../../logic/types/RightsAndRoles';
import CaptionString from '../../Common/CaptionString.vue';
import type { AssetRights } from '../../../logic/types/Rights';
import ValueSwitcher from '#components/Common/ValueSwitcher.vue';
import UiPreferenceManager from '#logic/managers/UiPreferenceManager';
import FormImsToggleWithSettings from '#components/Form/FormImsToggleWithSettings.vue';

type DialogProps = {
  assetId?: string;
  workspaceId?: string;
};

type DialogResult = boolean | undefined | null;

export default defineComponent({
  name: 'SetUpNotificationsDialog',
  components: {
    DialogContent,
    CaptionString,
    ValueSwitcher,
    FormImsToggleWithSettings,
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
      openedTabName: 'my',
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
    UiPreferenceManager() {
      return this.$getAppManager().get(UiPreferenceManager);
    },
    notifyAboutChanges: {
      get(): boolean {
        return this.UiPreferenceManager.getPreference(
          'NotificationsSettings.notifyAboutChanges',
          true,
        );
      },
      set(val: boolean) {
        this.UiPreferenceManager.setPreference(
          'NotificationsSettings.notifyAboutChanges',
          val,
        );
      },
    },
    notifyAboutComments: {
      get(): boolean {
        return this.UiPreferenceManager.getPreference(
          'NotificationsSettings.notifyAboutComments',
          true,
        );
      },
      set(val: boolean) {
        this.UiPreferenceManager.setPreference(
          'NotificationsSettings.notifyAboutComments',
          val,
        );
      },
    },
    isAdmin() {
      return this.$getAppManager().get(ProjectManager).isAdmin();
    },
    tabs() {
      return [
        {
          name: 'my',
          title: this.$t('setUpNotificationDialog.my'),
        },
        {
          name: 'roles',
          title: this.$t('setUpNotificationDialog.roles'),
        },
      ];
    },
    currentUserRole() {
      return this.$getAppManager().get(ProjectManager).getUserRoleInProject();
    },
    myRights() {
      const role = this.$getAppManager()
        .get(ProjectManager)
        .getUserRoleInProject();
      return role
        ? this.currentRights.find((item) => item.roleNum === role?.num)
        : null;
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

<style lang="scss" rel="stylesheet/scss">
.SetUpNotificationsDialog-roles-th {
  font-weight: 400 !important;
}
</style>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/Form';
.SetUpNotificationsDialog-setting {
  display: flex;
  gap: 10px;
}
.SetUpNotificationsDialog-setting-title {
  width: 260px;
}
.SetUpNotificationsDialog-roles {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.SetUpNotificationsDialog-role {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 25px;
}
.SetUpNotificationsDialog-role-settings-select {
  min-width: 180px;
}
.SetUpNotificationsDialog-role-current {
  font-weight: bold;
}
.SetUpNotificationsDialog-role-settings {
  display: flex;
  align-items: center;
  gap: 5px;
}
.SetUpNotificationsDialog-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}
</style>

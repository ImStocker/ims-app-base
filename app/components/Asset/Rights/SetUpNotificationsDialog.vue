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
        <div
          v-if="openedTabName === 'my'"
          class="SetUpNotificationsDialog-settings"
        >
          <div class="SetUpNotificationsDialog-setting">
            <div class="SetUpNotificationsDialog-setting-title">
              {{ $t('setUpNotificationDialog.notifyAboutChanges') }}
            </div>
            <form-ims-toggle-with-settings
              v-if="myRights && currentUserRole"
              :role-num="currentUserRole.num"
              :option="'subscribedChange'"
              :project-right="getRightsByRole(currentUserRole.num)"
              :model-value="myRights.subscribedChange"
              @update:model-value="addUserChange('subscribedChange', $event)"
              @update:delete-change="deleteUserChange('subscribedChange')"
            ></form-ims-toggle-with-settings>
          </div>
          <div class="SetUpNotificationsDialog-setting">
            <div class="SetUpNotificationsDialog-setting-title">
              {{ $t('setUpNotificationDialog.notifyAboutComments') }}
            </div>
            <form-ims-toggle-with-settings
              v-if="myRights && currentUserRole"
              :role-num="currentUserRole.num"
              :option="'subscribedComment'"
              :project-right="getRightsByRole(currentUserRole.num)"
              :model-value="myRights.subscribedComment"
              @update:model-value="addUserChange('subscribedComment', $event)"
              @update:delete-change="deleteUserChange('subscribedComment')"
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
              <tr v-for="role of allRoles" :key="role.num">
                <th class="SetUpNotificationsDialog-roles-th">
                  <caption-string
                    :value="
                      role.num === 0
                        ? $t('setUpAccessDialog.anyoneWhoHasLink')
                        : role?.title
                    "
                  ></caption-string>
                </th>
                <th>
                  <form-ims-toggle-with-settings
                    :role-num="role.num"
                    :option="'subscribedChange'"
                    :project-right="getRightsByRole(role.num)"
                    :model-value="
                      getRightsValueByRole(role.num, 'subscribedChange')
                    "
                    @update:model-value="
                      addRoleChange(role.num, 'subscribedChange', $event)
                    "
                    @update:delete-change="
                      deleteRoleChange(role.num, 'subscribedChange')
                    "
                  ></form-ims-toggle-with-settings>
                </th>
                <th>
                  <form-ims-toggle-with-settings
                    :role-num="role.num"
                    :option="'subscribedComment'"
                    :model-value="
                      getRightsValueByRole(role.num, 'subscribedComment')
                    "
                    :project-right="getRightsByRole(role.num)"
                    @update:model-value="
                      addRoleChange(role.num, 'subscribedComment', $event)
                    "
                    @update:delete-change="
                      deleteRoleChange(role.num, 'subscribedComment')
                    "
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
import CaptionString from '../../Common/CaptionString.vue';
import ValueSwitcher from '#components/Common/ValueSwitcher.vue';
import UiPreferenceManager from '#logic/managers/UiPreferenceManager';
import FormImsToggleWithSettings from '#components/Form/FormImsToggleWithSettings.vue';
import type { ProjectFullRole } from '#logic/types/RightsAndRoles';
import {
  type ProjectSubscriptionInspectResponseDTO,
  ProjectSubscriptionInspectResponseRightType,
} from '#logic/types/SubscriptionInspect';
import ApiManager from '#logic/managers/ApiManager';

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
      initialRights: undefined as
        | ProjectSubscriptionInspectResponseDTO
        | undefined,
      isLoading: true,
      busy: false,
      roleChanges: [] as {
        roleNum: number;
        subscribedChange?: boolean | null;
        subscribedComment?: boolean | null;
      }[],
      userChanges: [] as {
        userId: number;
        subscribedChange?: boolean | null;
        subscribedComment?: boolean | null;
      }[],
      allRoles: [] as ProjectFullRole[],
    };
  },
  computed: {
    userInfo() {
      return this.$getAppManager().get(ApiManager).getTokenInfo();
    },
    UiPreferenceManager() {
      return this.$getAppManager().get(UiPreferenceManager);
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
      const user = this.userInfo;
      if (!user) return;
      const own_rights = this.roleChanges.find(
        (change) => change.roleNum === user.id,
      );
      if (own_rights) {
        return {
          userId: user.id,
          subscribedChange: own_rights.subscribedChange ?? null,
          subscribedComment: own_rights.subscribedComment ?? null,
          type: ProjectSubscriptionInspectResponseRightType.OWN,
        };
      } else {
        const initial_rights = this.initialRights?.byUser.find(
          (item) => item.userId === user.id,
        );

        return initial_rights
          ? initial_rights
          : {
              userId: user.id,
              subscribedChange: null,
              subscribedComment: null,
              type: ProjectSubscriptionInspectResponseRightType.OWN,
            };
      }
    },
  },
  async mounted() {
    this.isLoading = true;
    this.$emit('dialog-parameters', {
      forbidClose: true,
    });
    const roles = await this.$getAppManager()
      .get(ProjectManager)
      .getRolesList({});
    this.allRoles = roles.list;
    this.initialRights = await this.$getAppManager()
      .get(ProjectManager)
      .getInspectRights(
        this.dialog.state.assetId,
        this.dialog.state.workspaceId,
      );
    this.isLoading = false;
  },
  methods: {
    getRightsByRole(role_num: number) {
      const own_rights = this.roleChanges.find(
        (change) => change.roleNum === role_num,
      );
      if (own_rights) {
        return {
          roleNum: role_num,
          subscribedChange: own_rights.subscribedChange ?? null,
          subscribedComment: own_rights.subscribedComment ?? null,
          type: ProjectSubscriptionInspectResponseRightType.OWN,
        };
      } else {
        const initial_rights = this.initialRights?.byRole.find(
          (item) => item.roleNum === role_num,
        );

        return initial_rights
          ? initial_rights
          : {
              roleNum: role_num,
              subscribedChange: null,
              subscribedComment: null,
              type: ProjectSubscriptionInspectResponseRightType.OWN,
            };
      }
    },
    getRightsValueByRole(
      role_num: number,
      type: 'subscribedChange' | 'subscribedComment',
    ) {
      const rights = this.getRightsByRole(role_num);
      if (rights) {
        return rights[type];
      }
      return null;
    },
    addRoleChange(
      role_num: number,
      change_type: 'subscribedChange' | 'subscribedComment',
      val: boolean | null,
    ) {
      const ind = this.roleChanges.findIndex((ch) => ch.roleNum === role_num);
      if (ind > -1) {
        this.roleChanges[ind][change_type] = val;
      } else {
        const initial_rights = this.initialRights?.byRole.find(
          (item) => item.roleNum === role_num,
        );
        this.roleChanges.push({
          roleNum: role_num,
          ...(initial_rights ? initial_rights : {}),
          [change_type]: val,
        });
      }
    },
    deleteRoleChange(
      role_num: number,
      change_type: 'subscribedChange' | 'subscribedComment',
    ) {
      const ind = this.roleChanges.findIndex((ch) => ch.roleNum === role_num);
      if (ind > -1) {
        this.roleChanges[ind][change_type] = null;
        if (
          this.roleChanges[ind].subscribedChange === null &&
          this.roleChanges[ind].subscribedComment === null
        ) {
          this.roleChanges.splice(ind, 1);
        }
      } else {
        const initial_rights = this.initialRights?.byRole.find(
          (item) => item.roleNum === role_num,
        );
        this.roleChanges.push({
          roleNum: role_num,
          ...(initial_rights ? initial_rights : {}),
        });
      }
    },
    addUserChange(
      change_type: 'subscribedChange' | 'subscribedComment',
      val: boolean | null,
    ) {
      const user = this.userInfo;
      if (!user) return;
      const ind = this.userChanges.findIndex((ch) => ch.userId === user.id);
      if (ind > -1) {
        this.userChanges[ind][change_type] = val;
      } else {
        const initial_rights = this.initialRights?.byUser.find(
          (item) => item.userId === user.id,
        );
        this.userChanges.push({
          userId: user.id,
          ...(initial_rights ? initial_rights : {}),
          [change_type]: val,
        });
      }
    },
    deleteUserChange(change_type: 'subscribedChange' | 'subscribedComment') {
      const user = this.userInfo;
      if (!user) return;
      const ind = this.userChanges.findIndex((ch) => ch.userId === user.id);
      if (ind > -1) {
        this.userChanges[ind][change_type] = null;
        if (
          this.userChanges[ind].subscribedChange === null &&
          this.userChanges[ind].subscribedComment === null
        ) {
          this.userChanges.splice(ind, 1);
        }
      } else {
        const initial_rights = this.initialRights?.byUser.find(
          (item) => item.userId === user.id,
        );
        this.userChanges.push({
          userId: user.id,
          ...(initial_rights ? initial_rights : {}),
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
            .setWorkspaceInspectRightsList(
              this.roleChanges.map((rs) => {
                return {
                  workspaceId: workspace_id,
                  roleNum: rs.roleNum,
                  subscribedChange: rs.subscribedChange,
                  subscribedComment: rs.subscribedComment,
                };
              }),
            );
          await this.$getAppManager()
            .get(ProjectManager)
            .changeMemberSubscriptionWorkspaces(
              this.userChanges.map((change) => {
                return {
                  workspaceId: workspace_id,
                  userId: change.userId,
                  subscribedChange: change.subscribedChange,
                  subscribedComment: change.subscribedComment,
                };
              }),
            );
        }
        if (this.dialog.state.assetId) {
          const asset_id = this.dialog.state.assetId;
          await this.$getAppManager()
            .get(ProjectManager)
            .setAssetInspectRightsList(
              this.roleChanges.map((rs) => {
                return {
                  assetId: asset_id,
                  roleNum: rs.roleNum,
                  subscribedChange: rs.subscribedChange,
                  subscribedComment: rs.subscribedComment,
                };
              }),
            );
          await this.$getAppManager()
            .get(ProjectManager)
            .changeMemberSubscriptionAssets(
              this.userChanges.map((change) => {
                return {
                  assetId: asset_id,
                  userId: change.userId,
                  subscribedChange: change.subscribedChange,
                  subscribedComment: change.subscribedComment,
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
.SetUpNotificationsDialog-settings {
  display: flex;
  gap: 5px;
  flex-direction: column;
}
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

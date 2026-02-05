<template>
  <div class="ProjectWatcherPropEditor">
    <div v-if="loading" class="ProjectWatcherPropEditor-loading">
      <span class="loaderSpinner"></span>
      {{ $t('common.loading') }}
    </div>
    <div v-else-if="loadingError" class="ProjectWatcherPropEditor-loadingError">
      {{ loadingError }}
    </div>
    <div
      v-else
      class="ProjectWatcherPropEditor-content use-buttons-icon-rounded"
    >
      <div v-for="watcher of watchers" :key="watcher.AccountId">
        <menu-button>
          <template #button="{ toggle }">
            <button
              class="is-button is-button-user ProjectWatcherPropEditor-button"
              :title="watcher.Name"
              @click="toggle"
            >
              <user-profile-icon
                v-if="watcher.Name"
                :user="watcher"
              ></user-profile-icon>
              <i v-else class="ri-user-line"></i>
            </button>
          </template>
          <menu-list :menu-list="menuList(watcher)"></menu-list>
        </menu-button>
      </div>
      <div v-if="!isGuest && canAddWatchers" class="use-buttons-icon">
        <button
          class="is-button ProjectWatcherPropEditor-add"
          @click="addWatcher()"
        >
          <i class="ri-add-line"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import {
  castAssetPropValueToAccount,
  type AssetPropValue,
  type AssetPropValueAccount,
} from '../../logic/types/Props';
import DialogManager from '../../logic/managers/DialogManager';
import TaskManager, {
  TASK_MAX_WATCHERS,
} from '../../logic/managers/TaskManager';
import UiManager from '../../logic/managers/UiManager';
import SelectProjectMemberDialog from '../Common/SelectProjectMemberDialog.vue';
import ConfirmDialog from '../Common/ConfirmDialog.vue';
import type { AssetFullInstanceR } from '../../logic/types/AssetFullInstance';
import type { MenuListItem } from '../../logic/types/MenuList';
import MenuButton from '../Common/MenuButton.vue';
import MenuList from '../Common/MenuList.vue';
import UserProfileIcon from '../UserProfileIcon.vue';
import ProjectManager from '../../logic/managers/ProjectManager';

export default defineComponent({
  name: 'ProjectWatcherPropEditor',
  components: {
    MenuButton,
    MenuList,
    UserProfileIcon,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    nullable: { type: Boolean, default: true },
    roleNums: { type: Object as PropType<number[]>, default: null },
    placeholder: { type: String, default: '' },
    assetFull: {
      type: Object as PropType<AssetFullInstanceR>,
      required: true,
    },
  },
  emits: ['update:modelValue', 'blur', 'preEnter', 'enter'],
  data() {
    return {
      loading: false,
      loadingError: null as string | null,
    };
  },
  computed: {
    canAddWatchers() {
      return this.watchers.length < TASK_MAX_WATCHERS;
    },
    watchers(): AssetPropValueAccount[] {
      const exists_watchers: AssetPropValueAccount[] = [];
      if (this.assetFull) {
        for (const ind of (this.modelValue as number[]) ?? []) {
          const watcher = castAssetPropValueToAccount(
            this.assetFull.getPropValue('info', `watchers\\${ind}`).value,
          );
          if (watcher) {
            exists_watchers.push(watcher);
          }
        }
      }
      return exists_watchers;
    },
    isGuest() {
      return !this.$getAppManager().get(ProjectManager).getUserRoleInProject();
    },
  },
  methods: {
    menuList(watcher: AssetPropValueAccount): MenuListItem[] {
      return [
        {
          title: this.$t('boardPage.removeWatcher'),
          danger: true,
          action: () => this.removeWatcher(watcher),
        },
      ];
    },
    async addWatcher() {
      const new_watcher = await this.$getAppManager()
        .get(DialogManager)
        .show(SelectProjectMemberDialog, {
          dialogHeader: this.$t('boardPage.addWatcher'),
          excludeValues: [],
        });
      if (new_watcher) {
        await this.$getAppManager()
          .get(UiManager)
          .doTask(async () => {
            await this.$getAppManager()
              .get(TaskManager)
              .addTaskWatcher(this.assetFull.id, new_watcher);
          });
      }
    },
    async removeWatcher(watcher: AssetPropValueAccount) {
      const confirm = await this.$getAppManager()
        .get(DialogManager)
        .show(ConfirmDialog, {
          header: this.$t('boardPage.removeWatcher'),
          message: this.$t('boardPage.removeWatcherConfirm'),
          danger: true,
        });
      if (confirm) {
        await this.$getAppManager()
          .get(UiManager)
          .doTask(async () => {
            await this.$getAppManager()
              .get(TaskManager)
              .removeTaskWatcher(this.assetFull.id, watcher);
          });
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.ProjectWatcherPropEditor {
  padding-top: 5px;
}
.ProjectWatcherPropEditor-loading {
  display: flex;
  align-items: center;
  .loaderSpinner {
    margin: 5px;
    font-size: 6px;
  }
}

.ProjectWatcherPropEditor-loadingError {
  padding: 5px;
  color: var(--color-main-error);
}

.ProjectWatcherPropEditor-select {
  border: none;
  background: none;
  width: 100%;
  display: block;
}
.ProjectWatcherPropEditor-button {
  --button-width: 2em !important;
  --button-height: 2em !important;
  --button-font-size: 13px;
}
.ProjectWatcherPropEditor-content {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
.ProjectWatcherPropEditor-add {
  border: none;
}
</style>

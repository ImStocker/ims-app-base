<template>
  <div class="NotificationIcon">
    <i
      v-if="currentType"
      :class="currentType.icon"
      :title="currentType.title"
    ></i>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import {
  AssetUnreadFlag,
  isAssetUnreadFlag,
} from '../../../logic/types/AssetUnread';
export default defineComponent({
  name: 'NotificationIcon',
  props: {
    unread: {
      type: Number,
      default: AssetUnreadFlag.CHANGE,
    },
  },
  computed: {
    currentType() {
      if (!this.currentFlag) return null;
      return this.notificationTypes[this.currentFlag];
    },
    currentFlag() {
      for (const flag of [
        AssetUnreadFlag.MENTION,
        AssetUnreadFlag.NOTIFY,
        AssetUnreadFlag.COMMENT,
        AssetUnreadFlag.CHANGE,
      ]) {
        const has_flag = isAssetUnreadFlag(this.unread, flag);
        if (has_flag) {
          return flag;
        }
      }
      return null;
    },
    notificationTypes() {
      return {
        [AssetUnreadFlag.CHANGE]: {
          title: this.$t('assetUnreadFlags.change'),
          icon: 'ri-circle-fill',
        },
        [AssetUnreadFlag.COMMENT]: {
          title: this.$t('assetUnreadFlags.comment'),
          icon: 'ri-message-2-fill',
        },
        [AssetUnreadFlag.NOTIFY]: {
          title: this.$t('assetUnreadFlags.notify'),
          icon: 'ri-notification-fill',
        },
        [AssetUnreadFlag.MENTION]: {
          title: this.$t('assetUnreadFlags.mention'),
          icon: 'ri-at-fill',
        },
      };
    },
  },
});
</script>
<style lang="scss">
.NotificationIcon {
}
</style>

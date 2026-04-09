<template>
  <div class="UserProfileIcon">
    <div class="UserProfileIcon-content">
      <img
        v-if="avatarImage"
        :src="avatarImage"
        class="UserProfileIcon-content-img"
      />
      <span v-else class="UserProfileIcon-content-name">{{
        croppedUserName
      }}</span>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { AssetPropValueAccount } from '../../logic/types/Props';
import AuthManager from '../../logic/managers/AuthManager';
import ProjectManager from '../../logic/managers/ProjectManager';
import { getAccountShortAbbr } from '../../logic/utils/stringUtils';

export default defineComponent({
  name: 'UserProfileIcon',
  props: {
    user: {
      type: [Object, null] as PropType<AssetPropValueAccount | null>,
      default: null,
    },
    imageSize: {
      type: Number,
      default: 64,
    },
  },
  computed: {
    avatarImage() {
      if (!this.displayingUserId) {
        return null;
      }
      return this.$getAppManager()
        .get(AuthManager)
        .getAvatarSync(this.displayingUserId, this.imageSize);
    },
    displayingUserName() {
      if (this.user) return this.user.Name;
      const account_val = this.$getAppManager()
        .get(ProjectManager)
        .getCurrentAccountValueInProject();
      return account_val ? account_val.Name : '';
    },
    displayingUserId() {
      if (this.user) return this.user.AccountId;
      const account_val = this.$getAppManager()
        .get(ProjectManager)
        .getCurrentAccountValueInProject();
      return account_val ? account_val.AccountId : '';
    },
    croppedUserName() {
      return getAccountShortAbbr(this.displayingUserName);
    },
  },
  watch: {
    displayingUserId() {
      this.reloadAvatar();
    },
  },
  async mounted() {
    await this.reloadAvatar();
  },
  methods: {
    async reloadAvatar() {
      if (!this.displayingUserId) {
        return;
      }
      try {
        await this.$getAppManager()
          .get(AuthManager)
          .getAvatar(this.displayingUserId, this.imageSize);
      } catch (err) {
        console.error(err);
      }
    },
  },
});
</script>
<style lang="scss" scoped>
.UserProfileIcon {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  border-radius: 100%;
  overflow: hidden;
}
.UserProfileIcon-content-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}
.UserProfileIcon-content-name {
  font-weight: 700;
}
</style>

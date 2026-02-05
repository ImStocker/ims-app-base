<template>
  <div class="RequestSignInBlock">
    {{ $t(title) }}
    <service-link
      name="sign-in"
      class="is-button is-button-action accent"
      @click.prevent="openSignInDialog()"
    >
      {{ $t('auth.signInButton') }}
    </service-link>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import AuthManager from '../../logic/managers/AuthManager';
import ServiceLink from '../Common/ServiceLink.vue';
export default defineComponent({
  name: 'RequestSignInBlock',
  components: {
    ServiceLink,
  },
  props: {
    title: {
      type: String,
      default: 'auth.needLoginForAction',
    },
  },
  data() {
    return {
      inProcess: false,
    };
  },
  methods: {
    async openSignInDialog() {
      const logged_in = await this.$getAppManager()
        .get(AuthManager)
        .ensureLoggedInDialog(this.$t('auth.needLoginForAction'));
      if (!logged_in) return;
    },
  },
});
</script>
<style lang="scss" rel="stylesheet/scss" scoped>
[data-theme='ims-dark'] {
  .RequestSignInBlock {
    --RequestSignInBlock-text-color: var(--color-accent);
  }
}
[data-theme='ims-light'] {
  .RequestSignInBlock {
    --RequestSignInBlock-text-color: var(--local-text-color);
  }
}
.RequestSignInBlock {
  width: 100%;
  text-align: center;
  padding: 10px 15px;
  border: 1px solid var(--RequestSignInBlock-text-color);
  border-radius: 4px;
  justify-content: space-between;
  display: flex;
  align-items: center;

  color: var(--RequestSignInBlock-text-color);
}
</style>

<template>
  <CenteredPage>
    <template #header>
      <div class="App-header">
        <h1>{{ t('welcomePage.title') }}</h1>
      </div>
    </template>
    <div class="ProjectWelcomePage">
      <p>{{ t('welcomePage.text') }}</p>
    </div>
  </CenteredPage>
</template>
<script setup lang="ts">
import { definePageMeta, useI18n, usePageHead } from '#imports';
import CenteredPage from '../../../../../components/Common/CenteredPage.vue';
const { t } = useI18n();
usePageHead(() => ({
  title: t('welcomePage.title') + ' | ' + 'IMS Creators',
}));
definePageMeta({
  name: 'project-welcome',
  middleware: 'check-has-user-role-in-project',
});
</script>
<style lang="scss" scoped>
@use '$style/devices-mixins.scss';
.ProjectWelcomePage {
  width: 800px;
  background-color: var(--default-bg-primary);
  padding: 15px 20px;
  border-radius: 4px;

  p {
    margin-bottom: 0;
  }

  @include devices-mixins.device-type(not-pc) {
    width: 100%;
  }
}
</style>

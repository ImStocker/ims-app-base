<template>
  <CenteredPage>
    <template #header>
      <div class="App-header">
        <h1>{{ $t('history.changesHistory') }}</h1>
      </div>
    </template>
    <div class="ChangesHistoryPage">
      <ChangesHistory></ChangesHistory>
    </div>
  </CenteredPage>
</template>
<script setup lang="ts">
import { definePageMeta, useI18n, usePageHead } from '#imports';
import ChangesHistory from '../../../../../components/ChangesHistory/ChangesHistory.vue';
import CenteredPage from '../../../../../components/Common/CenteredPage.vue';
const { t } = useI18n();
definePageMeta({
  name: 'project-changes-history',
  middleware: 'check-has-user-role-in-project',
});
usePageHead(() => ({
  title: t('history.changesHistory') + ' | ' + 'IMS Creators',
}));
</script>
<style lang="scss" scoped>
.ChangesHistoryPage {
  width: 800px;
  max-width: 100%;
}
</style>

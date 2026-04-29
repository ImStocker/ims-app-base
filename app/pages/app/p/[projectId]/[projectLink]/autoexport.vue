<template>
  <CenteredPage>
    <template #header>
      <div class="App-header">
        <h1>{{ $t('autoExport.autoExportPageHeader') }}</h1>
      </div>
    </template>
    <div class="AutoExportPage">
      <div class="AutoExportPage-info">
        {{ $t('autoExport.autoExportPageInfo') }}
      </div>
      <div class="AutoExportPage-configuration">
        <AutoExportConfigurationSetup></AutoExportConfigurationSetup>
      </div>
    </div>
  </CenteredPage>
</template>
<script setup lang="ts">
import { definePageMeta, useI18n, usePageHead } from '#imports';
import AutoExportConfigurationSetup from '#components/Sync/AutoExportConfigurationSetup.vue';
import CenteredPage from '../../../../../components/Common/CenteredPage.vue';

const { t } = useI18n();
definePageMeta({
  name: 'project-autoexport',
  middleware: [
    'non-template-project-check' as any,
    'check-has-user-role-in-project',
  ],
});
usePageHead(() => {
  return {
    title: t('autoExport.autoExportPageHeader') + ' | ' + 'IMS Creators',
  };
});
</script>
<style lang="scss" scoped>
.AutoExportPage {
  width: 800px;
  max-width: 100%;
}
.AutoExportPage-info {
  margin-bottom: 20px;
}
</style>

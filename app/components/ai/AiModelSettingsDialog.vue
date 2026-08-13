<template>
  <dialog-content
    class="AiModelSettingsDialog is-landing"
    @escape-press="dialog.close()"
  >
    <template #header>{{ t('aiSettings.header') }}</template>
    <template #content>
      <form @submit.prevent>
        <div class="AiModelSettingsDialog-row">
          <label for="provider" class="AiModelSettingsDialog-label">{{
            t('aiSettings.aiProvider')
          }}</label>
          <ImsSelect
            v-model="selectedProviderName"
            :options="AiModelDescriptorList"
            :reduce="(opt: any) => opt.name"
            :get-option-label="(opt: any) => t('aiModelNames.' + opt.name)"
            :placeholder="t('aiSettings.selectAiProvider')"
            class="AiModelSettingsDialog-input"
            @update:model-value="onProviderChange"
          />
        </div>
        <AiModelSettingsDialogProvider
          v-if="selectedProvider"
          ref="providerRef"
          v-model="formValues"
          :provider="selectedProvider"
        ></AiModelSettingsDialogProvider>
        <div class="AiModelSettingsDialog-actions">
          <button
            type="button"
            class="is-button is-button-action"
            @click="dialog.close()"
          >
            {{ t('aiSettings.close') }}
          </button>
          <button
            v-if="selectedProvider"
            :disabled="!canSave"
            type="button"
            class="is-button is-button-action accent"
            @click="saveSettings"
          >
            {{ t('aiSettings.save') }}
          </button>
        </div>
      </form>
    </template>
  </dialog-content>
</template>

<script setup lang="ts">
import ImsSelect from '#components/Common/ImsSelect.vue';
import { computed, ref, type PropType } from 'vue';
import { AiModelDescriptorList } from '#logic/ai-core/AiModelDescriptors';
import type { AiSettingsModel } from '#logic/ai-core/AiSettings';
import AiModelSettingsDialogProvider from './AiModelSettingsDialogProvider.vue';
import { useAppManager, useI18n } from '#imports';
import AiManager from '#logic/ai-core/AiManager';
import type { DialogInterface } from '#logic/managers/DialogManager';
import DialogContent from '#components/Dialog/DialogContent.vue';

type DialogProps = {
  setProviderName?: string;
};

type DialogResult = void;

const appManager = useAppManager();
const { t } = useI18n();

const props = defineProps({
  dialog: {
    type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
    required: true,
  },
});

const currentSettings = computed(() => {
  return appManager.get(AiManager).getSettings();
});

const selectedProviderName = ref(
  props.dialog.state.setProviderName ?? currentSettings.value?.selectedModel,
);
const selectedProvider = computed(() => {
  if (!selectedProviderName.value) return null;
  return (
    AiModelDescriptorList.find(
      (provider) => provider.name === selectedProviderName.value,
    ) ?? null
  );
});

const formValues = ref<Partial<AiSettingsModel>>({});
updateFormValues();

const canSave = computed(() => {
  if (!selectedProvider.value) return false;
  return !!(formValues.value.model ?? '').trim();
});

function updateFormValues() {
  const provider = selectedProvider.value;
  if (!provider) {
    formValues.value = {};
    return;
  }
  const currentValues = currentSettings.value.models.find(
    (model) => model.name === provider.name,
  );
  formValues.value = {
    name: provider.name,
    ...(currentValues ? currentValues : {}),
  };
  for (const prop of provider.properties) {
    if (formValues.value[prop.name] === undefined) {
      formValues.value[prop.name] = prop.default;
    }
  }
}

function onProviderChange() {
  updateFormValues();
}

function saveSettings() {
  if (!formValues.value.name) return;

  appManager.get(AiManager).addModel(formValues.value as AiSettingsModel);
  appManager.get(AiManager).selectModel(formValues.value.name);

  props.dialog.close();
}
</script>

<style lang="scss" scoped>
.AiModelSettingsDialog {
  width: 600px;
  overflow: auto;
  height: 100%;
  background: var(--local-bg-color);
  z-index: 10;
}

.AiModelSettingsDialog-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.AiModelSettingsDialog-label {
  font-weight: 600;
  width: 8rem;
  flex-shrink: 0;
  color: var(--root-text-color);
}

.AiModelSettingsDialog-input {
  flex: 1;
}

.AiModelSettingsDialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
}
</style>

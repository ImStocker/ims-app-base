<template>
  <div class="AiModelProvider">
    <template v-for="prop in provider.properties" :key="prop.name">
      <div class="AiModelProvider-row">
        <label :for="prop.name" class="AiModelProvider-label">{{
          formatLabel(prop.name)
        }}</label>
        <ImsInput
          :id="prop.name"
          :model-value="modelValue[prop.name] as string | undefined"
          :type="
            prop.name === 'apiKey' && !passwordVisible[prop.name]
              ? 'password'
              : 'text'
          "
          :placeholder="prop.placeholder ?? getDefaultPlaceholder(prop.name)"
          class="AiModelProvider-input"
          autocomplete="off"
          @update:model-value="changeValue(prop.name, $event)"
        >
          <template v-if="prop.name === 'apiKey'" #append>
            <button
              type="button"
              class="AiModelProvider-passwordToggle"
              @click="togglePasswordVisibility(prop.name)"
            >
              <i
                :class="
                  passwordVisible[prop.name] ? 'ri-eye-off-line' : 'ri-eye-line'
                "
              />
            </button>
          </template>
        </ImsInput>
      </div>
    </template>
    <div v-if="provider.fetchModels" class="AiModelProvider-row">
      <label for="model" class="AiModelProvider-label">{{
        t('aiSettings.model')
      }}</label>
      <div class="AiModelProvider-inputWrap">
        <ImsSelect
          v-model="selectedModel"
          :options="modelOptions"
          :placeholder="t('aiSettings.selectOrTypeModel')"
          class="AiModelProvider-input"
          :taggable="true"
          :disabled="!canFetchModels"
        />
        <div
          v-if="provider.fetchModels?.tags?.length"
          class="AiModelProvider-tags"
        >
          <button
            v-for="tag in provider.fetchModels.tags"
            :key="tag.name"
            type="button"
            class="AiModelProvider-tag"
            :title="tag.description ? t(tag.description) : undefined"
            @click="changeValue('model', tag.name)"
          >
            {{ tag.name }}
          </button>
        </div>
      </div>
    </div>
    <div v-else class="AiModelProvider-row">
      <label for="model" class="AiModelProvider-label">{{
        t('aiSettings.model')
      }}</label>
      <div class="AiModelProvider-inputWrap">
        <ImsInput
          id="model"
          :model-value="selectedModel"
          :placeholder="t('aiSettings.enterModelName')"
          class="AiModelProvider-input"
          autocomplete="off"
          @update:model-value="selectedModel = $event"
        />
      </div>
    </div>
    <div v-if="modelsError" class="AiModelProvider-error">
      <p class="AiModelProvider-errorText">{{ modelsError }}</p>
    </div>
    <div v-if="provider.note" class="AiModelProvider-note">
      <p class="AiModelProvider-noteText">{{ t(provider.note) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import ImsInput from '#components/Common/ImsInput.vue';
import ImsSelect from '#components/Common/ImsSelect.vue';
import { type PropType, ref, reactive, watch, computed } from 'vue';
import type { AiModelDescriptor } from '#logic/ai-core/AiModelDescriptors';
import type { AiSettingsModel } from '#logic/ai-core/AiSettings';
import { useI18n } from '#imports';

const { t } = useI18n();

const props = defineProps({
  provider: {
    type: Object as PropType<AiModelDescriptor>,
    required: true,
  },
  modelValue: {
    type: Object as PropType<Partial<AiSettingsModel>>,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue']);

const passwordVisible = reactive<Record<string, boolean>>({});

function togglePasswordVisibility(name: string) {
  passwordVisible[name] = !passwordVisible[name];
}

const loadingModels = ref(false);
const modelOptions = ref<string[]>([]);
const modelsError = ref<string | null>(null);
let fetchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const selectedModel = computed({
  get: () => props.modelValue.model ?? '',
  set: (val) => changeValue('model', val),
});

const canFetchModels = computed(() => {
  if (!props.provider.fetchModels) return false;
  if (props.provider.fetchModels.requireApiKey) {
    return !!props.modelValue.apiKey;
  }
  return true;
});

watch(
  () => props.provider,
  () => {
    fetchModelsIfNeeded();
  },
  { immediate: true },
);

watch(
  () => props.modelValue.apiKey,
  () => {
    fetchModelsIfNeeded();
  },
);

watch(
  () => props.modelValue.baseUrl,
  () => {
    fetchModelsIfNeeded();
  },
);

function fetchModelsIfNeeded() {
  modelOptions.value = [];
  modelsError.value = null;
  if (!props.provider.fetchModels) return;
  if (!canFetchModels.value) {
    modelOptions.value = [];
    return;
  }
  if (fetchDebounceTimer) clearTimeout(fetchDebounceTimer);
  fetchDebounceTimer = setTimeout(fetchModels, 400);
}

async function fetchModels() {
  if (!props.provider.fetchModels) return;
  if (!canFetchModels.value) return;

  loadingModels.value = true;
  modelsError.value = null;

  try {
    const results = await props.provider.fetchModels.fetch(props.modelValue);
    modelOptions.value = results.map((r) => r.name);
  } catch (err: any) {
    console.warn('Failed to fetch models:', err);
    modelsError.value = err.message ?? t('aiSettings.failedToLoadModels');
    modelOptions.value = [];
  } finally {
    loadingModels.value = false;
  }
}

function changeValue(prop: string, value: any) {
  const newValue = {
    ...props.modelValue,
    [prop]: value,
  };
  emit('update:modelValue', newValue);
}

function formatLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function getDefaultPlaceholder(name: string): string {
  return '';
}
</script>

<style lang="scss" scoped>
.AiModelProvider {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.AiModelProvider-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.AiModelProvider-label {
  font-weight: 600;
  width: 8rem;
  flex-shrink: 0;
  color: var(--root-text-color);
}

.AiModelProvider-input {
  width: 100%;
}

.AiModelProvider-inputWrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.AiModelProvider-passwordToggle {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  color: var(--local-sub-text-color);
  font-size: var(--input-font-size);

  &:hover {
    color: var(--root-text-color);
  }
}

.AiModelProvider-error {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: color-mix(in oklab, var(--color-danger) 10%, transparent);
  border: 1px solid var(--color-danger);
  border-radius: 0.375rem;
}

.AiModelProvider-errorText {
  font-size: 0.875rem;
  margin: 0;
  color: var(--color-danger);
}

.AiModelProvider-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.AiModelProvider-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.1875rem 0.625rem;
  font-size: 0.75rem;
  background-color: var(--local-box-color);
  border: none;
  border-radius: 0.3125rem;
  cursor: pointer;
  transition: background-color 0.15s;
  color: var(--local-text-color);
  user-select: none;
  line-height: 1.4;
  white-space: nowrap;

  &:hover {
    background-color: transparent;
  }
}

.AiModelProvider-note {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: color-mix(in oklab, var(--color-accent) 10%, transparent);
  border: 1px solid color-mix(in oklab, var(--color-accent) 30%, transparent);
  border-radius: 0.375rem;
}

.AiModelProvider-noteText {
  font-size: 0.875rem;
  margin: 0;
  color: var(--root-text-color);
  white-space: pre-wrap;
}
</style>

import type { LanguageModel } from 'ai';
import type { AiSettings, AiSettingsModel } from './AiSettings';
import { createOllama } from 'ai-sdk-ollama';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createXai } from '@ai-sdk/xai';
import { AppSubManagerBase } from '../managers/IAppManager';
import type { AiModelDef } from './AiModelDef';
import { AiModelDescriptorList } from './AiModelDescriptors';
import DialogManager from '#logic/managers/DialogManager';
import { defineAsyncComponent } from 'vue';

const AI_SETTINGS_KEY = 'aiSettings';

export default class AiManager extends AppSubManagerBase {
  private _settings: AiSettings | null = null;
  private _waitAiSettingsResolve: ((res: AiSettings) => void) | null = null;
  private _waitAiSettingsResolveSet: ((res: AiSettings) => void)[] = [];

  protected async loadSettings(): Promise<AiSettings | null> {
    try {
      const stored = localStorage.getItem(AI_SETTINGS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  protected async saveSettings(settings: AiSettings): Promise<void> {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
  }

  async initClient() {
    this._settings = await this.loadSettings();
    if (this.aiModelSettingsValidModel() && this._settings) {
      this._resolveWaitAiSettings(this._settings);
    }
  }

  getSettings(): AiSettings {
    if (!this._settings) {
      this._settings = {
        selectedModel: '',
        models: [],
      };
    }
    return this._settings;
  }

  getAiModelDef(): AiModelDef | null {
    const settings = this.getSettings();
    if (!settings.selectedModel) return null;
    const model_params = settings.models.find(
      (m) => m.name === settings.selectedModel,
    );
    if (!model_params) return null;
    if (!model_params.model) return null;

    const descriptor = AiModelDescriptorList.find(
      (d) => d.name === model_params.name,
    );
    if (!descriptor) return null;

    const model = this.getAiModel();
    if (!model) return null;

    return {
      model,
      settings: model_params,
      descriptor,
    };
  }

  aiModelSettingsValidModel(): AiSettingsModel | null {
    const settings = this.getSettings();
    if (!settings || !settings.selectedModel) {
      return null;
    }
    const model = settings.models.find(
      (m) => m.name === settings.selectedModel,
    );
    if (!model) {
      return null;
    }
    return model;
  }

  addModel(model: AiSettingsModel): void {
    const settings = this.getSettings();
    const existingIndex = settings.models.findIndex(
      (m) => m.name === model.name,
    );
    if (existingIndex >= 0) {
      settings.models[existingIndex] = model;
    } else {
      settings.models.push(model);
    }
    this.saveSettings(settings);
  }

  selectModel(name: string): void {
    const settings = this.getSettings();
    settings.selectedModel = name;
    this.saveSettings(settings);
    this._resolveWaitAiSettings(settings);
  }

  async waitAiSettings(): Promise<AiSettings> {
    const settings = this.getSettings();
    if (settings.models.length > 0 && settings.selectedModel) {
      return settings;
    }
    return new Promise((resolve) => {
      this._waitAiSettingsResolveSet.push(resolve);
    });
  }

  private _resolveWaitAiSettings(settings: AiSettings): void {
    if (this._waitAiSettingsResolve) {
      this._waitAiSettingsResolve(settings);
      this._waitAiSettingsResolve = null;
    }
    for (const resolve of this._waitAiSettingsResolveSet) {
      resolve(settings);
    }
    this._waitAiSettingsResolveSet = [];
  }

  getAiModel(): LanguageModel | null {
    const settings = this.getSettings();
    if (!settings.selectedModel) return null;
    const model_params = settings.models.find(
      (m) => m.name === settings.selectedModel,
    );
    if (!model_params) return null;
    if (!model_params.model) return null;

    switch (model_params.name) {
      case 'ollama':
        return createOllama({ baseURL: model_params.baseUrl })(
          model_params.model,
          {
            think: true,
          },
        );
      case 'ollama_cloud':
        return createOllama({
          baseURL: model_params.baseUrl ?? 'https://api.ollama.com',
          apiKey: model_params.apiKey,
        })(model_params.model, {
          think: true,
        });
      case 'openai':
        return createOpenAI({ apiKey: model_params.apiKey }).chat(
          model_params.model,
        );
      case 'openrouter':
        return createOpenAI({
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: model_params.apiKey,
          name: 'openrouter',
        }).chat(model_params.model);
      case 'grok':
        return createXai({ apiKey: model_params.apiKey })(model_params.model);
      case 'gemini':
        return createGoogleGenerativeAI({ apiKey: model_params.apiKey })(
          model_params.model,
        );
      case 'deepseek':
        return createDeepSeek({ apiKey: model_params.apiKey })(
          model_params.model,
        );
      case 'anthropic':
        return createAnthropic({ apiKey: model_params.apiKey })(
          model_params.model,
        );
      case 'custom':
        return createOpenAI({
          baseURL: model_params.baseUrl,
          apiKey: model_params.apiKey,
          name: 'custom',
        }).chat(model_params.model);
    }

    return null;
  }

  async ensureAiModelSetupDialog(): Promise<boolean> {
    const modelDef = this.getAiModelDef();
    if (!modelDef) {
      const AiModelSettingsDialog = defineAsyncComponent(
        () => import('#components/ai/AiModelSettingsDialog.vue'),
      );
      await this.appManager.get(DialogManager).show(AiModelSettingsDialog, {
        setProviderName: undefined,
      });
      const newModelDef = this.getAiModelDef();
      return !!newModelDef;
    } else {
      return true;
    }
  }
}

import type { LanguageModel } from 'ai';
import type { AiModelDescriptor } from './AiModelDescriptors';
import type { AiSettingsModel } from './AiSettings';

export type AiModelDef = {
  model: LanguageModel;
  settings: AiSettingsModel;
  descriptor: AiModelDescriptor;
};

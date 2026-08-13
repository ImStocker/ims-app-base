export type AiSettingsModel = {
  name: string;
  apiKey?: string;
  baseUrl?: string;
  thinking?: boolean;
  noImages?: boolean;
  model?: string;
};

export type AiSettings = {
  selectedModel: string;
  models: AiSettingsModel[];
};

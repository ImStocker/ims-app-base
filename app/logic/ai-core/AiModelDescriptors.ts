import type { AiSettingsModel } from './AiSettings';

export type AiModelDescriptor = {
  name: string;
  title: string;
  properties: {
    name: keyof AiSettingsModel;
    placeholder?: string;
    default?: any;
    advanced?: true;
    type: 'text' | 'toggle' | 'password';
  }[];
  fetchModels?: {
    fetch: (settings: Partial<AiSettingsModel>) => Promise<{ name: string }[]>;
    requireApiKey: boolean;
    tags?: { name: string; description?: string }[];
  };
  note?: string;
};

async function parseErrorBody(response: Response): Promise<string> {
  let msg = `HTTP ${response.status}`;
  try {
    const body = await response.text();
    const parsed = JSON.parse(body);
    if (parsed?.error?.message) msg += `: ${parsed.error.message}`;
    else if (parsed?.error) msg += `: ${parsed.error}`;
  } catch {
    /* ignore parse errors */
  }
  return msg;
}

async function fetchOpenRouterModels(
  settings: Partial<AiSettingsModel>,
): Promise<{ name: string }[]> {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': encodeURIComponent(document.title),
    },
  });
  if (!response.ok) throw new Error(await parseErrorBody(response));
  const data = await response.json();
  return data.data.map((m: any) => ({ name: m.id }));
}

async function fetchOllamaModels(
  settings: Partial<AiSettingsModel>,
): Promise<{ name: string }[]> {
  const baseUrl = settings.baseUrl ?? 'http://localhost:11434';
  const response = await fetch(`${baseUrl}/api/tags`);
  if (!response.ok) throw new Error(await parseErrorBody(response));
  const data = await response.json();
  return data.models.map((m: any) => ({ name: m.name }));
}

// async function fetchOllamaCloudModels(settings: Partial<AiSettingsModel>): Promise<{ name: string }[]> {
//   const baseUrl = settings.baseUrl ?? 'https://api.ollama.com'
//   const response = await fetch(`${baseUrl}/api/tags`, {
//     headers: {
//       'Authorization': `Bearer ${settings.apiKey}`
//     }
//   })
//   if (!response.ok) throw new Error(await parseErrorBody(response))
//   const data = await response.json()
//   return data.models.map((m: any) => ({ name: m.name }))
// }

async function fetchOpenAiModels(
  settings: Partial<AiSettingsModel>,
): Promise<{ name: string }[]> {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
    },
  });
  if (!response.ok) throw new Error(await parseErrorBody(response));
  const data = await response.json();
  return data.data.map((m: any) => ({ name: m.id }));
}

async function fetchDeepseekModels(
  settings: Partial<AiSettingsModel>,
): Promise<{ name: string }[]> {
  const response = await fetch('https://api.deepseek.com/v1/models', {
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
    },
  });
  if (!response.ok) throw new Error(await parseErrorBody(response));
  const data = await response.json();
  return data.data.map((m: any) => ({ name: m.id }));
}

// async function fetchAnthropicModels(settings: Partial<AiSettingsModel>): Promise<{ name: string }[]> {
//   const response = await fetch('https://api.anthropic.com/v1/models', {
//     headers: {
//       'x-api-key': settings.apiKey,
//       'anthropic-version': '2023-06-01'
//     } as any
//   })
//   if (!response.ok) throw new Error(await parseErrorBody(response))
//   const data = await response.json()
//   return data.models.map((m: any) => ({ name: m.id }))
// }

async function fetchGeminiModels(
  settings: Partial<AiSettingsModel>,
): Promise<{ name: string }[]> {
  const apiKey = settings.apiKey;
  if (!apiKey) return [];
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
  );
  if (!response.ok) throw new Error(await parseErrorBody(response));
  const data = await response.json();
  return data.models.map((m: any) => ({ name: m.name }));
}

async function fetchGrokModels(
  settings: Partial<AiSettingsModel>,
): Promise<{ name: string }[]> {
  const response = await fetch('https://api.x.ai/v1/models', {
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
    },
  });
  if (!response.ok) throw new Error(await parseErrorBody(response));
  const data = await response.json();
  return data.data.map((m: any) => ({ name: m.id }));
}

export const AiModelDescriptorList: AiModelDescriptor[] = [
  {
    name: 'openrouter',
    title: 'OpenRouter',
    properties: [{ name: 'apiKey', placeholder: 'sk-or-', type: 'password' }],
    fetchModels: {
      fetch: fetchOpenRouterModels,
      requireApiKey: true,
    },
    note: 'aiNotes.openrouter',
  },
  {
    name: 'ollama',
    title: 'Ollama',
    properties: [
      {
        name: 'baseUrl',
        placeholder: 'http://localhost:11434',
        default: 'http://localhost:11434',
        type: 'text',
      },
    ],
    fetchModels: {
      fetch: fetchOllamaModels,
      requireApiKey: false,
      tags: [
        { name: 'gemma4:31b-cloud', description: 'aiTags.gemma4' },
        { name: 'minimax-m3:cloud' },
      ],
    },
    note: 'aiNotes.ollama',
  },
  {
    name: 'gemini',
    title: 'Gemini',
    properties: [{ name: 'apiKey', type: 'password' }],
    fetchModels: {
      fetch: fetchGeminiModels,
      requireApiKey: true,
    },
    note: 'aiNotes.gemini',
  },
  {
    name: 'openai',
    title: 'OpenAI (GPT)',
    properties: [{ name: 'apiKey', placeholder: 'sk-', type: 'password' }],
    fetchModels: {
      fetch: fetchOpenAiModels,
      requireApiKey: true,
    },
  },
  {
    name: 'grok',
    title: 'Grok',
    properties: [{ name: 'apiKey', type: 'password' }],
    fetchModels: {
      fetch: fetchGrokModels,
      requireApiKey: true,
    },
  },
  {
    name: 'deepseek',
    title: 'Deepseek',
    properties: [{ name: 'apiKey', type: 'password' }],
    fetchModels: {
      fetch: fetchDeepseekModels,
      requireApiKey: true,
    },
  },
  {
    name: 'custom',
    title: 'Custom',
    properties: [
      { name: 'baseUrl', type: 'text' },
      { name: 'apiKey', type: 'password' },
    ],
    note: 'aiNotes.custom',
  },
];

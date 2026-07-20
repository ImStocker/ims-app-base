import type { AiSpecEntry } from '#logic/types/AiSpec';

export const checkboxFieldAiSpec: AiSpecEntry = {
  name: 'checkbox',
  title: '[[t:CheckboxField]]',
  aiSpec: {
    brief:
      'Boolean toggle (checkbox) field for yes/no flags, toggles, and enable/disable settings.',
  },
};

import type { AiSpecEntry } from '#logic/types/AiSpec';

export const projectUserFieldAiSpec: AiSpecEntry = {
  name: 'projectUser',
  title: '[[t:ProjectUserField]]',
  aiSpec: {
    brief:
      'Project user/account selector for assigning project members to properties.',
    spec: 'Value is stored as AssetPropValueAccount with AccountId and Name.\n\nExample:\n{ "AccountId": "u1a2b3c4-...", "Name": "John Doe" }',
    needSpec: true,
  },
};

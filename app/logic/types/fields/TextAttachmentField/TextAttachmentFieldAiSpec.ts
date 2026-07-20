import type { AiSpecEntry } from '#logic/types/AiSpec';

export const textAttachmentFieldAiSpec: AiSpecEntry = {
  name: 'textAttachment',
  title: '[[t:TextAttachmentField]]',
  aiSpec: {
    brief:
      'Rich text field with inline file attachment support for embedded media.',
  },
};

import type { AiSpecEntry } from '#logic/types/AiSpec';

export const attachmentFieldAiSpec: AiSpecEntry = {
  name: 'attachment',
  title: '[[t:AttachmentField]]',
  aiSpec: {
    brief:
      'File attachment field for images, documents, audio, and other binary resources.',
    spec: 'Value is stored as AssetPropValueFile with FileId, Title, Size, Dir, and Store.\n\nExample:\n{ "FileId": "f1e2d3c4-...", "Title": "screenshot.png", "Size": 102400, "Dir": "/uploads", "Store": "default" }\n\nParameter:\n- accept (string) — filters allowed file extensions (e.g. ".jpg,.jpeg,.png")',
    needSpec: true,
  },
};

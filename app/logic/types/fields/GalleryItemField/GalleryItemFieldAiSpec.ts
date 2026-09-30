import type { AiSpecEntry } from '#logic/types/AiSpec';

export const galleryItemFieldAiSpec: AiSpecEntry = {
  name: 'galleryItem',
  title: '[[t:GalleryItemField]]',
  aiSpec: {
    brief:
      'Single item of a gallery: a media file, a video link or an external image link.',
    spec: 'Value is stored as a composite object.\n\nExample:\n{ "type": "file", "value": { "FileId": "a1b2c3d4-...", "Title": "poster.png", "Size": 1024 }, "title": "Poster" }\n\n- value (AssetPropValue) — AssetPropValueFile for type "file", URL string otherwise\n- type (string) — one of: file, youtube, extimage, extvideo, rutube, vkvideo; set automatically, never by hand\n- title (string | null) — optional caption\n\nAn empty value is stored as null.',
    needSpec: true,
  },
};

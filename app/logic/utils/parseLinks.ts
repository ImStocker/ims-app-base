export function parseYoutubeLink(url: string): string | null {
  if (!url) return null;
  url = url.trim();
  const re =
    /(https?:\/\/)?(((m|www)\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i;
  const m = url.match(re);
  if (!m) return null;
  return m[8];
}

export function parseVkVideoLink(url: string): string | null {
  if (!url) return null;
  url = url.trim();
  const re = /(https?:\/\/)?(www\.)?vk.com\/(video\?z=)?video(-?[0-9_]+)/i;
  const m = url.match(re);
  if (!m) return null;
  return m[4];
}

export function parseRutubeVideoLink(url: string): string | null {
  if (!url) return null;
  url = url.trim();
  const re = /(https?:\/\/)?(www\.)?rutube\.ru\/video\/([0-9a-z]{32})/i;
  const m = url.match(re);
  if (!m) return null;
  return m[3];
}

export function isExternalVideoValid(url: string): boolean {
  const regex = /^(https?:\/\/)?(www\.)?.+\..+\/.+\.mp4$/;
  return regex.test(url);
}

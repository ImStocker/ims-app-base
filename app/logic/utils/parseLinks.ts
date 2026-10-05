export function parseYoutubeLink(url: string): string | null {
  if (!url) return null;
  url = url.trim();
  const re =
    /(https?:\/\/)?(((m|www)\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i;
  const m = url.match(re);
  if (!m) return null;
  return m[8];
}

const VK_VIDEO_HOSTS_RE = /^(?:[\w-]+\.)*(?:vk\.com|vk\.ru|vkvideo\.ru)$/i;

const VK_VIDEO_CODE_RE = /^\/?(?:videos?|clips?)?(-?\d+_\d+)/i;

export function parseVkVideoLink(url: string): string | null {
  if (!url) return null;
  url = url.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!VK_VIDEO_HOSTS_RE.test(parsed.hostname)) return null;

  const candidates = [parsed.pathname, ...parsed.searchParams.getAll('z')];
  const oid = parsed.searchParams.get('oid');
  const id = parsed.searchParams.get('id');
  if (oid && id) candidates.push(`${oid}_${id}`);

  for (const candidate of candidates) {
    const m = candidate.match(VK_VIDEO_CODE_RE);
    if (m) return m[1];
  }
  return null;
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

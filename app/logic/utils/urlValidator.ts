export function isValidHttpsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;

  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:') return false;

  const host = url.hostname.toLowerCase();
  if (host === 'localhost') return false;

  const ipv4Regex =
    /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
  if (ipv4Regex.test(host)) return false;
  if (host.includes(':')) return false;

  return true;
}

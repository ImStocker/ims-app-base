import { transliterate } from './transliterate';

export function escapeRegExp(str: string): string {
  return (str || '').toString().replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
}
export function createSlug(
  str: string,
  slice: { from: number; to: number } | null = null,
) {
  const result = str.replace(/[ ./]/g, '-').replace(/-+/g, '-');
  if (slice) return result.slice(slice.from, slice.to);
  else return result;
}

export function createTransliteratedSlug(
  title: string,
  slice: { from: number; to: number } | null = null,
  lang: 'en' | 'ru' | null = null,
) {
  let link = transliterate(title)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');

  if (lang && lang === 'ru' && link) {
    link = 'ru-' + link;
  }

  link = link.replace(/-+/g, '-').replace(/^-/, '').replace(/-$/, '');
  if (slice) return link.slice(slice.from, slice.to);
  return link;
}

export function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Asset "block-like" parts (PropBlock/AssetListBlock) keep their `title`
 * synced with their `name` via a single derivation rule (a capitalized
 * name). This is intentionally wrapped so the exact rule can be changed in
 * the future without touching call sites — change it here and both the
 * create-time sync and the paste-conflict re-sync below stay consistent.
 */

/**
 * Returns the name that would be derived from a synced block title, or
 * `null` when the title can't be derived structurally. Mirrors the inverse
 * of `capitalizeFirstLetter`: a synced title is always `capitalizeFirstLetter(name)`,
 * so the only structural inverse is the all-lowercase normalization of the
 * title's first letter.
 */
export function getSyncedAssetBlockNameFromTitle(
  title: string | null,
): string | null {
  if (!title) return null;
  return title.charAt(0).toLowerCase() + title.slice(1);
}

/**
 * True when the block's `title` is structurally the synced (default) title
 * for its `name` — i.e. `name === normalize(title)` as used by PropBlock and
 * AssetListBlock. When a pasted name gets a uniqueness index on conflict, the
 * title needs the same index to stay in sync; see AssetBlockEditorVM
 * (pasteBlocksFromClipboard).
 */
export function isAssetBlockTitleSyncedWithName(
  title: string | null,
  name: string | null,
): boolean {
  if (!title || !name) return false;
  return name === getSyncedAssetBlockNameFromTitle(title);
}

/**
 * Returns the title that keeps the name→title sync (the PropBlock contract:
 * `title === capitalizeFirstLetter(name)`). Used to re-derive the title when
 * the pasted name gets a uniqueness number on conflict.
 */
export function getSyncedAssetBlockTitleFromName(name: string): string {
  return capitalizeFirstLetter(name);
}

export function generateNextUniqueNameNumber(
  current: string,
  checkIsAvail: (name: string) => boolean,
  join = '',
  suffix = '',
): string {
  if (checkIsAvail(current + suffix)) return current + suffix;

  let base = current;
  const current_number = base.match(new RegExp(`${escapeRegExp(join)}(\\d+)$`));
  let start_attempt = 2;
  if (current_number) {
    base = current.substring(0, current.length - current_number[0].length);
    start_attempt = parseInt(current_number[1]) + 1;
  }

  for (let i = start_attempt; i < start_attempt + 10000; i++) {
    const next_name = base + join + i;
    if (checkIsAvail(next_name + suffix)) return next_name + suffix;
  }

  while (true) {
    const next_name = base + join + Math.random();
    if (checkIsAvail(next_name + suffix)) return next_name + suffix;
  }
}

export function getAccountShortAbbr(name: string) {
  if (!name) return '*';
  const expl = name.split(' ', 2);
  if (expl.length === 2 && expl[0] && expl[1]) return expl[0][0] + expl[1][0];
  else return name.substring(0, 2);
}

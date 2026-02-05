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

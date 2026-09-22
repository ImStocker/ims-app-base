export const AVATAR_COLOR_COUNT = 16;

export const AVATAR_COLOR_CLASS_PREFIX = 'is-avatar-color';

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function getAvatarColorIndex(name: string): number {
  return hashString(name || '') % AVATAR_COLOR_COUNT;
}

export function getAvatarColorClass(name: string): string {
  return `${AVATAR_COLOR_CLASS_PREFIX}-${getAvatarColorIndex(name)}`;
}

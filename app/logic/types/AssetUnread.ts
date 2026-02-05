export enum AssetUnreadFlag {
  CHANGE = 1 << 0,
  COMMENT = 1 << 1,
  NOTIFY = 1 << 2,
  MENTION = 1 << 3,
}

export function isAssetUnreadAny(unread: number) {
  return !!unread;
}

export function isAssetUnreadFlag(
  unread: number,
  flag: AssetUnreadFlag,
): boolean {
  return (unread & flag) === flag;
}

import { AppSubManagerBase } from './IAppManager';
import type { AuthTokenInfo } from './ApiWorker';
import { EntityCache } from '../types/EntityCache';
import { assert } from '#logic/utils/typeUtils';

export const DEFAULT_AVATAR_SIZE = 64;

export type AvatarEntity = {
  id: string;
  hasAvatar: boolean;
  // Callback producing the avatar image URL for a given size and reload epoch.
  url: (size: number, epoch: number) => string;
};

export default class AuthManager extends AppSubManagerBase {
  protected avatarsCache: EntityCache<AvatarEntity> | undefined;
  protected avatarReloadEpoch: number = 0;

  async init() {
    this.avatarsCache = new EntityCache<AvatarEntity>({
      key: 'id',
      ttl: 1000 * 60 * 10,
      loadFunc: async (userIds) => {
        const avatars = await this.loadAvatars(userIds as string[]);
        // Postprocess: preload the default (64px) avatar images so that the
        // most common size is already available without per-icon loading lag.
        if (typeof Image !== 'undefined') {
          for (const avatar of avatars) {
            if (avatar.hasAvatar) {
              const image = new Image();
              image.src = avatar.url(
                DEFAULT_AVATAR_SIZE,
                this.avatarReloadEpoch,
              );
            }
          }
        }
        this.avatarsCache?.addToCacheMany(avatars);
        return avatars;
      },
    });
  }

  protected async loadAvatars(_userIds: string[]): Promise<AvatarEntity[]> {
    return [];
  }

  getUserInfo(): AuthTokenInfo | undefined {
    return undefined;
  }

  async ensureLoggedInDialog(_message?: string): Promise<AuthTokenInfo | null> {
    return null;
  }

  protected updateAvatarInCache(avatar: AvatarEntity) {
    assert(this.avatarsCache, 'Not inited');
    this.avatarReloadEpoch++;
    this.avatarsCache.addToCache(avatar);
  }

  async getAvatar(
    user_id: string,
    size: number = DEFAULT_AVATAR_SIZE,
  ): Promise<string | null> {
    if (!this.avatarsCache) return null;
    const res = await this.avatarsCache.getElement(user_id);
    if (!res || !res.hasAvatar) return null;
    const url = res.url(size, this.avatarReloadEpoch);
    return url || null;
  }

  getAvatarSync(
    user_id: string,
    size: number = DEFAULT_AVATAR_SIZE,
  ): string | null | undefined {
    if (!this.avatarsCache) return undefined;
    const res = this.avatarsCache.getElementSync(user_id);
    if (res === undefined) return undefined;
    if (!res || !res.hasAvatar) return null;
    const url = res.url(size, this.avatarReloadEpoch);
    return url || null;
  }

  currentProjectUnload() {}
}

import { AppSubManagerBase } from './IAppManager';
import type { AuthTokenInfo } from './ApiWorker';

export type AvatarEntity = {
  id: string;
  hasAvatar: boolean;
};

export default class AuthManager extends AppSubManagerBase {
  getUserInfo(): AuthTokenInfo | undefined {
    return undefined;
  }

  async ensureLoggedInDialog(_message?: string): Promise<AuthTokenInfo | null> {
    return null;
  }

  async getAvatar(_user_id: string, _size: number): Promise<string | null> {
    return null;
  }

  getAvatarSync(_user_id: string, _size: number): string | null | undefined {
    return null;
  }
}

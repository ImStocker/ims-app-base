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
}

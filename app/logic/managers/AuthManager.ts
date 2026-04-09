import { AppSubManagerBase } from './IAppManager';
import type { AuthTokenInfo } from './ApiWorker';
import type { IProjectContext } from '#logic/types/IProjectContext';
import { UsersSubContext } from '#logic/project-sub-contexts/UsersSubContext';

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

  getCurrentAccountValueInProject(projectContext: IProjectContext | null) {
    const user_info = this.getUserInfo();
    if (!user_info) return null;
    let renamed: string | undefined;

    if (projectContext) {
      renamed = projectContext
        .get(UsersSubContext)
        .getRenamedMemberNameById(user_info.id.toString());
    }
    return {
      AccountId: user_info.id.toString(),
      Name: renamed ?? user_info.name,
    };
  }
}

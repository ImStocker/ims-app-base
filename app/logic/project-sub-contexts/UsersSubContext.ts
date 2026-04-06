import {
  ProjectSubContext,
  type IProjectContext,
} from '#logic/types/IProjectContext';
import type {
  ApiResultListWithTotal,
  ProjectMember,
} from '#logic/types/ProjectTypes';
import type {
  ProjectRightsInspectResponseDTO,
  RoleWorkspaceRightsChangeDTOOne,
  RoleWorkspaceRightsGetDTO,
  RoleAssetRightsChangeDTOOne,
} from '#logic/types/RightsAndRoles';

export class UsersSubContext extends ProjectSubContext {
  declare projectContext: IProjectContext; // To fix TS errors in app projects

  // To fix TS errors in app projects
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(projectContext: IProjectContext) {
    super(projectContext);
  }

  async getMembersList(): Promise<ApiResultListWithTotal<ProjectMember>> {
    return {
      list: [],
      total: 0,
    };
  }

  async getRights(
    _asset_id?: string,
    _workspace_id?: string,
  ): Promise<ProjectRightsInspectResponseDTO | undefined> {
    return;
  }

  async setWorkspaceRoleRightsList(
    _changes: RoleWorkspaceRightsChangeDTOOne[],
  ): Promise<ApiResultListWithTotal<RoleWorkspaceRightsGetDTO>> {
    return {
      list: [],
      total: 0,
    };
  }

  async setAssetRoleRightsList(
    _changes: RoleAssetRightsChangeDTOOne[],
  ): Promise<{ success: true }> {
    return {
      success: true,
    };
  }

  getRenamedMemberNameById(_user_id: string): string | undefined {
    return undefined;
  }
}

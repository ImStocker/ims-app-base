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
  declare projectContext: IProjectContext; // To fix TS errors

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
}

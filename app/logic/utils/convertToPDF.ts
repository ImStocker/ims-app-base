import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';
import type { IProjectContext } from '#logic/types/IProjectContext';
import type { AssetFullInstanceR } from '../types/AssetFullInstance';
import type { Workspace } from '../types/Workspaces';

export type ExportingContentAsset = {
  assetFull: AssetFullInstanceR;
};

export type ExportingContent = {
  workspace: Workspace | null;
  assetInfos: ExportingContentAsset[];
  workspaceInfos: ExportingContent[];
};

export type ExportingContentRenderState = {
  totalBlocks: number;
  renderedBlocks: number;
};

export async function loadExportingContent(
  projectContext: IProjectContext,
  assetIds: string[],
  workspaceId: string | null,
): Promise<ExportingContent> {
  const exporting_content: ExportingContent = {
    workspace: null,
    assetInfos: [],
    workspaceInfos: [],
  };
  if (workspaceId) {
    exporting_content.workspace = await projectContext
      .get(AssetSubContext)
      .getWorkspaceByIdViaCache(workspaceId);
    if (exporting_content.workspace) {
      const assets = (
        await projectContext.get(AssetSubContext).getAssetInstancesList({
          where: {
            workspaceId: exporting_content.workspace.id,
          },
        })
      ).list;
      exporting_content.assetInfos = assets.map((a) => ({ assetFull: a }));
      const sub_workspaces = (
        await projectContext.get(AssetSubContext).getWorkspacesList({
          where: {
            parentId: exporting_content.workspace.id,
          },
        })
      ).list;
      exporting_content.workspaceInfos = await Promise.all(
        sub_workspaces.map((w) =>
          loadExportingContent(projectContext, [], w.id),
        ),
      );
    }
  }
  if (assetIds.length > 0) {
    const assets = (
      await projectContext.get(AssetSubContext).getAssetInstancesList({
        where: {
          id: assetIds,
        },
      })
    ).list;
    exporting_content.assetInfos = [
      ...exporting_content.assetInfos,
      ...assets.map((a) => ({ assetFull: a })),
    ];
  }
  await Promise.all(
    exporting_content.assetInfos.map((a) => a.assetFull.resolveBlocks()),
  );
  return exporting_content;
}

import { useNuxtApp } from '#app';
import ProjectManager from '#logic/managers/ProjectManager';
import type { IProjectContext } from '#logic/types/IProjectContext';

export async function useProjectContext(
  projectId: string,
): Promise<IProjectContext | null> {
  const { $getAppManager } = useNuxtApp();
  return $getAppManager().get(ProjectManager).getProjectContext(projectId);
}

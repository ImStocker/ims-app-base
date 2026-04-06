import { useNuxtApp } from '#app';
import ProjectManager from '#logic/managers/ProjectManager';
import type { IProjectContext } from '#logic/types/IProjectContext';

export async function useProjectContext(
  projectId: string,
): Promise<IProjectContext | null> {
  const { $getAppManager } = useNuxtApp();
  return await $getAppManager()
    .get(ProjectManager)
    .requestProjectContext(projectId);
}

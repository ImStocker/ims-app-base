import type { IProjectContext } from '#logic/types/IProjectContext';
import { useRoute } from 'vue-router';
import { useProjectContext } from './useProjectContext';

export async function useRouteProjectContext(): Promise<IProjectContext | null> {
  const route = useRoute();
  const project_id = route.params.projectId;
  if (!project_id || project_id.length === 0) {
    return null;
  }

  return useProjectContext(project_id.toString());
}

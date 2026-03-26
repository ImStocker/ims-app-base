import type { IProjectContext } from '#logic/types/IProjectContext';
import { type RouteParamsGeneric, useRoute } from 'vue-router';
import { useProjectContext } from './useProjectContext';

export async function useRouteProjectContext(route?: {
  params?: RouteParamsGeneric;
}): Promise<IProjectContext | null> {
  const check_route = route ? route : useRoute();
  const project_id = check_route.params?.projectId;
  if (!project_id || project_id.length === 0) {
    return null;
  }

  return useProjectContext(project_id.toString());
}

export async function useRouteProjectContextRequired(route?: {
  params?: RouteParamsGeneric;
}): Promise<IProjectContext> {
  const projectContext = await useRouteProjectContext(route);
  if (!projectContext) {
    throw new Error('Project context not found');
  }
  return projectContext;
}

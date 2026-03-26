import { defineNuxtRouteMiddleware } from '#app';
import { redirectFromNameToIdBase } from '#logic/router/redirectFromNameToIdBase';
import { useRouteProjectContextRequired } from '~/composables/useRouteProjectContext';

export default defineNuxtRouteMiddleware(async (to) => {
  const projectContext = await useRouteProjectContextRequired(to);
  return redirectFromNameToIdBase(projectContext, to, 'asset');
});

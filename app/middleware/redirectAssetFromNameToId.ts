import { defineNuxtRouteMiddleware, useNuxtApp } from '#app';
import { redirectFromNameToIdBase } from '#logic/router/redirectFromNameToIdBase';

export default defineNuxtRouteMiddleware(async (to) => {
  const { $getAppManager } = useNuxtApp();
  return redirectFromNameToIdBase($getAppManager(), to, 'asset');
});

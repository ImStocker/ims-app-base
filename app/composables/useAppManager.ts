import { useNuxtApp } from '#app';

export function useAppManager() {
  const { $getAppManager } = useNuxtApp();
  return $getAppManager();
}

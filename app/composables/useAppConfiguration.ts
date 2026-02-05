import { useNuxtApp } from '#app';

export function useAppConfiguration() {
  const { $appConfiguration } = useNuxtApp();
  return $appConfiguration;
}

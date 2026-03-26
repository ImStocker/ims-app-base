import { useAsyncData, useNuxtApp, useRoute } from '#app';
import { ref, unref, watch } from 'vue';
import type {
  IProjectPageVMBaseCtr,
  ProjectPageVMBase,
} from '#logic/types/ProjectPageVMBase';
import { useRouteProjectContext } from './useRouteProjectContext';

type GetParams<VM> = VM extends ProjectPageVMBase<infer T> ? T : never;

export async function useProjectPageVM<
  T extends ProjectPageVMBase<any>,
  TParams = GetParams<T>,
>(
  vmClass: IProjectPageVMBaseCtr<any, T>,
  getParams: () => TParams,
  key?: string,
) {
  const { isHydrating } = useNuxtApp();
  const projectContext = await useRouteProjectContext();
  if (!projectContext) {
    throw new Error('Project context not found');
  }
  const vm = ref<T>(new vmClass(projectContext, getParams()));
  if (import.meta.server || isHydrating) {
    let restoring = true;
    const loaded = await useAsyncData(key ?? 'vmProjectPage', async () => {
      restoring = false;
      await unref(vm).load();
      return unref(vm).toJSON();
    });
    const loadedError = unref(loaded.error);
    if (loadedError) {
      throw loadedError;
    }
    if (restoring) {
      const data = unref(loaded.data);
      if (data) {
        unref(vm).loadJSON(data);
      }
    }
  } else {
    await unref(vm).load();
  }
  if (!import.meta.server) {
    const $route = useRoute();
    const route_key = JSON.stringify({
      name: $route.name,
      params: $route.params,
    });
    const unwatch_params = watch(
      () => {
        const $new_route = useRoute();
        const new_key = JSON.stringify({
          name: $new_route.name,
          params: $new_route.params,
        });
        if (route_key === new_key) {
          return getParams();
        } else {
          return null;
        }
      },
      (new_params) => {
        if (new_params) {
          vm.value.setParams(new_params);
        } else {
          unwatch_params();
        }
      },
    );
  }
  return vm;
}

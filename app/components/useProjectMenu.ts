import { computed, reactive, ref } from 'vue';
import { useAppManager } from '../composables/useAppManager';
import UiManager, { ScreenSize } from '../logic/managers/UiManager';
import { useAppConfiguration } from '../composables/useAppConfiguration';
import CreatorAssetManager from '../logic/managers/CreatorAssetManager';
import { DISCUSSION_WORKSPACE_NAME, TASKS_WORKSPACE_NAME } from '../logic/constants';
import {
  WORKSPACE_BACKLOG_NAME,
  WORKSPACE_CHECKLIST_NAME,
} from '../logic/utils/tasks';
import { GameDesignMenuVM } from '../logic/vm/GameDesignMenuVM';
import GlobalStateManager from '../logic/managers/GlobalStateManager';

export const PROJECT_MENU_TAB = 'project-gdd';
export const PROJECT_DISCUSSIONS_TAB = 'project-discussions';
export const PROJECT_SETTINGS_TAB = 'project-settings-info';
export const PROJECT_TASKS_TAB = 'project-tasks';

export function useProjectMenu() {
  const appManager = useAppManager();
  const appConfiguration = useAppConfiguration();

  const state = ref(
    appManager.get(GlobalStateManager).useGlobalState(
      'projectMenu',
      (saved) => {
        return {
          openedTab: saved ? (saved.openedTab as string | null) : null,
          mobile: saved ? (saved.mobile as boolean) : false,
          gddVmByRootId: new Map<string, GameDesignMenuVM>(
            saved
              ? Object.entries(saved.gddVmByRootId).map(([id, data]) => {
                  const vm = new GameDesignMenuVM(appManager, id);
                  vm.loadJSON(data as Record<string, any>);
                  return [id, vm];
                })
              : [],
          ),
          revealedItem: saved
            ? (saved.revealedItem as {
                type: 'asset' | 'workspace';
                id: string;
              } | null)
            : null,
        };
      },
      (state) => {
        return {
          openedTab: state.openedTab,
          mobile: state.mobile,
          revealedItem: state.revealedItem,
          gddVmByRootId: Object.fromEntries(
            [...state.gddVmByRootId.entries()].map(([id, vm]) => {
              return [id, vm.toJSON()];
            }),
          ),
        };
      },
    ),
  );

  const isSubmenuExistsFor = (tab_name: string) => {
    const projectMenu = appConfiguration.getProjectMenu(appManager);
    const tab = projectMenu.find((p) => p.name === tab_name);
    return !!tab && (tab.hasAdditionalMenu ?? true);
  };
  const isSubmenuExists = computed(() => {
    if (!state.value.openedTab) return false;
    return isSubmenuExistsFor(state.value.openedTab);
  });

  function initSubMenuGddVm(rootWorkspaceId: string): GameDesignMenuVM {
    let vm = state.value.gddVmByRootId.get(rootWorkspaceId);
    if (!vm) {
      vm = reactive(new GameDesignMenuVM(appManager, rootWorkspaceId));
      state.value.gddVmByRootId.set(rootWorkspaceId, vm);
    }
    return vm as GameDesignMenuVM;
  }

  async function loadSubMenuGddVm(
    rootWorkspaceId: string,
    revealWorkspaceIds: string[] = [],
  ) {
    const vm = initSubMenuGddVm(rootWorkspaceId);
    if (!vm.isLoaded()) {
      await vm.load();
      await vm.expandWorkspaceIds(revealWorkspaceIds);
    }
    return vm;
  }

  const revealProjectWorkspace = async (workspaceId: string) => {
    const revealed_workspaces =
      (await appManager
        .get(CreatorAssetManager)
        .getParentWorkspaces(workspaceId)) ?? [];
    const revealed_workspace_ids = revealed_workspaces.map((w) => w.id);
    const first_workspace =
      revealed_workspaces.length > 0 ? revealed_workspaces[0] : null;

    switch (first_workspace?.name) {
      case DISCUSSION_WORKSPACE_NAME:
        state.value.openedTab = PROJECT_DISCUSSIONS_TAB;
        await loadSubMenuGddVm(first_workspace.id, revealed_workspace_ids);
        break;
      case TASKS_WORKSPACE_NAME:
      case WORKSPACE_CHECKLIST_NAME:
      case WORKSPACE_BACKLOG_NAME:
        state.value.openedTab = PROJECT_TASKS_TAB;
        break;
      default:
        if (first_workspace) {
          await loadSubMenuGddVm(first_workspace.id, revealed_workspace_ids);
        }
        state.value.openedTab = PROJECT_MENU_TAB;
    }
    state.value.revealedItem = {
      type: 'workspace',
      id: workspaceId,
    };
  };
  const revealProjectAsset = async (assetId: string) => {
    const asset = await appManager
      .get(CreatorAssetManager)
      .getAssetShortViaCache(assetId);
    if (!asset || !asset.workspaceId) {
      state.value.openedTab = PROJECT_MENU_TAB;
      return;
    }
    await revealProjectWorkspace(asset.workspaceId);
    state.value.revealedItem = {
      type: 'asset',
      id: assetId,
    };
  };

  return {
    isMobileMenuOpened: computed(() => {
      const is_mobile = appManager
        .get(UiManager)
        .isScreenSize(ScreenSize.NOT_PC);
      return state.value.mobile && is_mobile;
    }),
    isSubmenuExistsFor,
    isSubmenuExists,
    openedSubMenu: computed(() => {
      return state.value.openedTab !== null && isSubmenuExists.value
        ? state.value.openedTab
        : null;
    }),
    openSubmenu: (tab: string) => {
      state.value.openedTab = tab;
    },
    closeSubmenu: () => {
      state.value.openedTab = null;
    },
    setMobileMenuOpened: (val: boolean) => {
      state.value.mobile = val;
    },
    revealProjectAsset,
    revealProjectWorkspace,
    initSubMenuGddVm,
    hasMenu: (name: string) => {
      const menu = appConfiguration.getProjectMenu(appManager);
      return menu.some((m) => m.name === name);
    },
    getMenu: () => {
      return appConfiguration.getProjectMenu(appManager);
    },
    init: async () => {
      const menu = appConfiguration.getProjectMenu(appManager);
      await appManager
        .get(CreatorAssetManager)
        .requestWorkspaceInCacheByNames(
          menu
            .map((m) => m.rightsRelatedWorkspaceName)
            .filter((w) => w) as string[],
        );
    },
    getRevealedItem() {
      return state.value.revealedItem;
    },
  };
}

import { defineAsyncComponent } from 'vue';
import EditorManager from '#logic/managers/EditorManager';
import type { IAppManager } from '#logic/managers/IAppManager';
import { STRUCT_ASSET_ID, ENUM_ASSET_ID } from '#logic/constants';

export default function () {
  return [
    {
      type: 'module',
      content: {
        async activate(appManager: IAppManager) {
          const cancel_callbacks: { cancel: () => void }[] = [];

          cancel_callbacks.push(
            appManager.get(EditorManager).registerAssetLayout({
              name: 'full',
              pageComponent: defineAsyncComponent(
                () =>
                  import('#components/Asset/Layout/AssetFullPageLayout.vue'),
              ),
              editorComponent: defineAsyncComponent(
                () =>
                  import(
                    '#components/Asset/Editor/AssetBlockFullHeightEditor.vue'
                  ),
              ),
              props: {
                toolbarShowBlockCopyPaste: false,
                headerLocaleButton: true,
                headerPropsButton: true,
              },
            }),
          );

          cancel_callbacks.push(
            appManager.get(EditorManager).registerAssetLayout({
              name: 'detached',
              pageComponent: defineAsyncComponent(
                () =>
                  import('#components/Asset/Layout/AssetDefaultPageLayout.vue'),
              ),
              editorComponent: defineAsyncComponent(
                () =>
                  import(
                    '#components/Asset/Editor/AssetBlockDetachedEditor.vue'
                  ),
              ),
              props: {},
            }),
          );

          cancel_callbacks.push(
            appManager.get(EditorManager).registerAssetLayout({
              name: 'enum',
              pageComponent: defineAsyncComponent(
                () =>
                  import('#components/Asset/Layout/AssetDefaultPageLayout.vue'),
              ),
              editorComponent: defineAsyncComponent(
                () =>
                  import(
                    '#components/Asset/SpecialTypes/AssetBlockEnumEditor.vue'
                  ),
              ),
              props: {
                toolbarShowBlockCopyPaste: false,
              },
            }),
          );

          cancel_callbacks.push(
            appManager.get(EditorManager).registerAssetLayout({
              name: 'struct',
              pageComponent: defineAsyncComponent(
                () =>
                  import('#components/Asset/Layout/AssetDefaultPageLayout.vue'),
              ),
              editorComponent: defineAsyncComponent(
                () =>
                  import(
                    '#components/Asset/SpecialTypes/AssetBlockStructEditor.vue'
                  ),
              ),
              props: {
                toolbarShowBlockCopyPaste: false,
              },
            }),
          );

          cancel_callbacks.push(
            appManager
              .get(EditorManager)
              .registerAssetLayoutBind(STRUCT_ASSET_ID, 'struct'),
          );

          cancel_callbacks.push(
            appManager
              .get(EditorManager)
              .registerAssetLayoutBind(ENUM_ASSET_ID, 'enum'),
          );

          return async () => {
            for (const descr of cancel_callbacks) {
              descr.cancel();
            }
          };
        },
      },
    },
  ];
}

import { defineAsyncComponent } from 'vue';
import { STRUCT_ASSET_ID, ENUM_ASSET_ID } from '#logic/constants';
import EditorSubContext from '#logic/project-sub-contexts/EditorSubContext';
import { assert } from '#logic/utils/typeUtils';
import type { IProjectContext } from '#logic/types/IProjectContext';

export default function () {
  return [
    {
      type: 'module',
      content: {
        async activate(projectContext: IProjectContext) {
          const cancel_callbacks: { cancel: () => void }[] = [];
          assert(projectContext, 'Project context not provided');

          cancel_callbacks.push(
            projectContext.get(EditorSubContext).registerAssetLayout({
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
            projectContext.get(EditorSubContext).registerAssetLayout({
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
            projectContext.get(EditorSubContext).registerAssetLayout({
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
            projectContext.get(EditorSubContext).registerAssetLayout({
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
            projectContext
              .get(EditorSubContext)
              .registerAssetLayoutBind(STRUCT_ASSET_ID, 'struct'),
          );

          cancel_callbacks.push(
            projectContext
              .get(EditorSubContext)
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

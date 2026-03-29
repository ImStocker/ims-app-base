import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';
import type { AssetProps } from '#logic/types/Props';
import type { IProjectContext } from '#logic/types/IProjectContext';
import { DialogSubContext } from '#logic/project-sub-contexts/DialogSubContext';

export class EmbedBlockDefinition extends BlockTypeDefinition {
  name = 'embed';
  component = async () => (await import('./EmbedBlock.vue')).default;
  icon = 'external-link-fill';

  override focusOnAdded = false;
  override async beforeBlockCreate(
    projectContext: IProjectContext,
    params: { title: string },
  ): Promise<{ title: string; props?: AssetProps } | undefined> {
    const AddEmbedDialog = (await import('./AddEmbedDialog.vue')).default;
    const res = await projectContext
      .get(DialogSubContext)
      .show(AddEmbedDialog, {
        link: '',
        title: params.title,
        canRename: true,
      });
    if (!res) return undefined;
    return {
      title: params.title,
      props: {
        value: res.link,
      },
    };
  }
}

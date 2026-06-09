import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';
import type { IAppManager } from '#logic/managers/IAppManager';
import type { AssetProps } from '#logic/types/Props';
import DialogManager from '#logic/managers/DialogManager';

export class EmbedBlockDefinition extends BlockTypeDefinition {
  name = 'embed';
  component = async () => (await import('./EmbedBlock.vue')).default;
  icon = 'external-link-fill';

  override focusOnAdded = false;
  override aiSpec =
    'This block stores an embedded external resource. Props: `value` (string — the URL to embed). The block classifies the URL into a DetectedEmbedKind: UNKNOWN, INVALID, GOOGLE_DOC, GOOGLE_SHEET, GOOGLE_PRESENTATION, YOUTUBE, MIRO, FIGMA. For recognized kinds it renders an iframe with the embeddable URL variant; for unknown URLs it shows a plain hyperlink.';
  override async beforeBlockCreate(
    appManager: IAppManager,
    params: { title: string },
  ): Promise<{ title: string; props?: AssetProps } | undefined> {
    const AddEmbedDialog = (await import('./AddEmbedDialog.vue')).default;
    const res = await appManager.get(DialogManager).show(AddEmbedDialog, {
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

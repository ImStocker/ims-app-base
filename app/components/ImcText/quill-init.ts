import './imc-editor.scss';
import type Quill from 'quill';
import type { ImcEditorModule } from './ImcEditorModule';
export enum QuillSources {
  API = 'api',
  SILENT = 'silent',
  USER = 'user',
}

export const QUILL_SCOPE_INLINE = 7;

export type QuillInitedInterface = {
  Quill: typeof Quill;
  ImcEditorModule: typeof ImcEditorModule;
};

export async function initQuillClientSide(): Promise<QuillInitedInterface> {
  const [
    QuillDep,
    ImcLinksModuleDep,
    ImcAssetBlotDep,
    ImcUploadJobBlotDep,
    ImcFileBlotDep,
    ImcIconBlotDep,
    ImcPropBlotDep,
    ImcEditorModuleDep,
    ImcClipboardDep,
    ImcBubbleDep,
    ImcListItemBlotDep,
    ImcColorAttributorDep,
    ImcLinkBlotDep,
    ImcFormulaBlotDep,
  ] = await Promise.all([
    import('quill'),
    import('./ImcLinksModule'),
    import('./blots/ImcAssetBlot'),
    import('./blots/ImcUploadJobBlot'),
    import('./blots/ImcFileBlot'),
    import('./blots/ImcIconBlot'),
    import('./blots/ImcPropBlot'),
    import('./ImcEditorModule'),
    import('./ImcClipboard'),
    import('./ImcBubble'),
    import('./blots/ImcListItemBlot'),
    import('./ImcColorAttributor'),
    import('./blots/ImcLinkBlot'),
    import('./blots/ImcFormulaBlot'),
  ]);

  if (!(QuillDep.default as any).imcInited) {
    const Align = QuillDep.default.import('attributors/style/align') as any;
    const Icons = QuillDep.default.import('ui/icons') as any;
    Icons.align['left'] = Icons.align['']; // set icon for 'left' option, otherwise it's replaced with 'undefined' text
    Align.whitelist = ['left', 'center', 'right', 'justify']; // add explicit 'left' option
    QuillDep.default.register(Align, true);

    QuillDep.default.register(
      'attributors/style/color',
      ImcColorAttributorDep.ImcColorAtrributor as any,
      true,
    );
    QuillDep.default.register(
      'formats/color',
      ImcColorAttributorDep.ImcColorStyle as any,
      true,
    );
    QuillDep.default.register(
      'formats/link',
      ImcLinkBlotDep.ImcLinkBlot as any,
      true,
    );
    QuillDep.default.register(
      'formats/formula',
      ImcFormulaBlotDep.ImcFormulaBlot as any,
      true,
    );

    QuillDep.default.register(
      'themes/imcbuble',
      ImcBubbleDep.ImcBubble as any,
      true,
    );
    QuillDep.default.register(
      'modules/imclinks',
      ImcLinksModuleDep.ImcLinksModule as any,
      true,
    );
    QuillDep.default.register(
      'modules/imceditor',
      ImcEditorModuleDep.ImcEditorModule as any,
      true,
    );
    QuillDep.default.register(ImcAssetBlotDep.ImcAssetBlot, true);
    QuillDep.default.register(ImcUploadJobBlotDep.ImcUploadJobBlot, true);
    QuillDep.default.register(ImcFileBlotDep.ImcFileBlot, true);
    QuillDep.default.register(ImcIconBlotDep.ImcIconBlot, true);
    QuillDep.default.register(ImcPropBlotDep.ImcPropBlot, true);
    QuillDep.default.register(ImcListItemBlotDep.ListContainer, true);
    QuillDep.default.register(ImcListItemBlotDep.ListItem, true);
    QuillDep.default.register(
      'modules/clipboard',
      ImcClipboardDep.ImcClipboard as any,
      true,
    );

    (QuillDep.default as any).imcInited = true;
  }

  return {
    Quill: QuillDep.default,
    ImcEditorModule: ImcEditorModuleDep.ImcEditorModule,
  };
}

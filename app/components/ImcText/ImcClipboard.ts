import Quill from 'quill';
import Clipboard from 'quill/modules/clipboard';
import type { Range } from 'quill/core/selection.js';
import Delta from 'quill-delta';
import tinycolor from 'tinycolor2';
import type { ImcEditorQuillController } from './ImcEditorQuillController';
import { base64ToBuffer } from '../../logic/utils/dataUtils';
import EditorSubContext from '../../logic/project-sub-contexts/EditorSubContext';
import UiManager from '../../logic/managers/UiManager';

const ALLOWED_MIME_TYPES = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/gif': 'gif',
};

export class ImcClipboard extends Clipboard {
  controller: ImcEditorQuillController | null = null;

  override onPaste(
    range: Range,
    { text, html }: { text?: string; html?: string },
  ) {
    const formats = this.quill.getFormat(range.index);
    const pastedDelta = this.convert({ text, html }, formats);
    const delta = new Delta()
      .retain(range.index)
      .delete(range.length)
      .concat(pastedDelta);
    delta.forEach((op: any) => {
      if (op.insert && op.insert.image) {
        if (!this.controller) return;
        const image_uri = op.insert.image;

        if (typeof image_uri !== 'string' || !image_uri.startsWith('data:')) {
          return;
        }

        const parsed_base64 = image_uri.match(
          /^data:([^;,]+)(?:;base64)?,(.+)$/i,
        );
        if (!parsed_base64) {
          this.controller.component
            .$getAppManager()
            .get(UiManager)
            .showError('Invalid data URL format');
          return;
        }

        const data_type = parsed_base64[1].toLowerCase();
        const base64_data = parsed_base64[2];

        const filename = ALLOWED_MIME_TYPES[data_type]
          ? 'image.' + ALLOWED_MIME_TYPES[data_type]
          : undefined;

        if (!filename) {
          this.controller.component
            .$getAppManager()
            .get(UiManager)
            .showError(`Forbidden MIME type: ${data_type}`);
          return;
        }

        delete op.insert.image;

        const buffer = base64ToBuffer(base64_data);
        const file = new File([buffer], filename, { type: data_type });
        const upload_job = this.controller.component
          .$getAppManager()
          .get(EditorSubContext)
          .attachFile(file, file.name);

        op.insert = {
          'upload-job': {
            uploadId: upload_job.uploadId,
            inline: /^image\//.test(file.type),
          },
        };

        upload_job.awaitResult().then(
          () => this.controller?.materializeFiles(),
          (err) =>
            this.controller?.component
              .$getAppManager()
              .get(UiManager)
              .showError(err),
        );
      }
      if (op.attributes && op.attributes.background) {
        delete op.attributes.background;
      }
      if (op.attributes && op.attributes.color) {
        const color = tinycolor(op.attributes.color);
        if (color.getLuminance() > 0.9 || color.getLuminance() < 0.1) {
          delete op.attributes.color;
        }
      }
      if (op.attributes && Object.keys(op.attributes).length === 0) {
        delete op.attributes;
      }
    });

    this.quill.updateContents(delta, Quill.sources.USER);
    // range.length contributes to delta.length()
    this.quill.setSelection(
      delta.length() - range.length,
      Quill.sources.SILENT,
    );
    this.quill.scrollSelectionIntoView();
  }
}

import Embed from 'quill/blots/embed';

export const IMC_UPLOAD_JOB_BLOT_CLASS = 'ql-imc-upload-job';

export type ImcUploadJobBlotData = {
  uploadId: string;
  inline: boolean;
};

export class ImcUploadJobBlot extends Embed {
  static override blotName = 'upload-job';
  static override tagName = 'span';
  static override className = IMC_UPLOAD_JOB_BLOT_CLASS;

  static override create(data: ImcUploadJobBlotData) {
    const node = super.create();
    ImcUploadJobBlot._applyFormat(node as HTMLElement, data);
    return node;
  }

  private static _applyFormat(
    element: HTMLElement,
    data: ImcUploadJobBlotData,
  ) {
    element.dataset.uploadId = data.uploadId;
    element.dataset.inline = data.inline ? '1' : '';
    element.innerHTML = '<span class="loaderDots"><i></i><i></i><i></i></span>';
  }

  static override value(element: HTMLElement): ImcUploadJobBlotData {
    return {
      uploadId: element.dataset.uploadId ?? '',
      inline: element.dataset.inline === '1',
    };
  }
}

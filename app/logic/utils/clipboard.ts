import { v4 as uuidv4 } from 'uuid';

export async function clipboardCopyPlainText(str: string) {
  try {
    if (!str) return;
    await window.navigator.clipboard.writeText(str);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err: any) {
    // Fallback method
    const fallback_area = document.createElement('textarea');
    fallback_area.style.position = 'fixed';
    fallback_area.style.top = '0';
    fallback_area.style.left = '0';
    fallback_area.style.width = '10px';
    fallback_area.style.height = '10px';
    document.body.appendChild(fallback_area);
    fallback_area.value = str;
    fallback_area.focus();
    fallback_area.setSelectionRange(0, fallback_area.value.length);
    document.execCommand('copy');
    document.body.removeChild(fallback_area);
  }
}

export async function clipboardReadPlainText() {
  if (!navigator.clipboard) {
    throw new Error('Have no access to clipboard');
  }
  return await window.navigator.clipboard.readText();
}

export async function getClipboardImagesContent() {
  if (!navigator.clipboard) {
    throw new Error('Have no access to clipboard');
  }
  const files: { blob: Blob; name: string }[] = [];
  const file_type_reg = new RegExp(/^image\/(.*)/);
  const clipboardItems = await navigator.clipboard.read();
  for (const clipboardItem of clipboardItems) {
    for (const type of clipboardItem.types) {
      const res = file_type_reg.exec(type);
      if (res) {
        const blob = await clipboardItem.getType(type);
        files.push({
          blob,
          name: `image-${uuidv4()}.${res[1]}`,
        });
      }
    }
  }
  return files;
}

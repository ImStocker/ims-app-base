import { assert } from './typeUtils';

export function base64ToBuffer(base64: string) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function bufferToBase64Async(arrayBuffer: BlobPart) {
  const blob = new Blob([arrayBuffer]);
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = function (event) {
      assert(event.target);
      assert(event.target.result);
      const base64Url = event.target.result.toString();
      const marker = 'base64,';
      resolve(base64Url.substring(base64Url.indexOf(marker) + marker.length));
    };
    reader.onerror = function () {
      reject('Error converting to base64');
    };
    reader.readAsDataURL(blob);
  });
}

export function decodeBufferToString(buffer: any) {
  if (window.TextDecoder) {
    const decoder = new window.TextDecoder('utf8');
    return decoder.decode(buffer);
  }
  return String.fromCharCode(...new Uint8Array(buffer));
}

export async function openBlobFile(blob: Blob, name: string) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.target = '_blank';
  link.href = blobUrl;
  if (name) {
    link.download = name;
  }
  link.style.width = '1px';
  link.style.height = '1px';
  link.style.display = 'block';
  link.style.position = 'absolute';
  link.style.top = '0';
  document.body.appendChild(link);
  link.click();
  await new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });
  link.removeAttribute('href');
  URL.revokeObjectURL(blobUrl);
  link.remove();
}

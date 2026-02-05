export const resizeImage = async (
  file: Blob,
  transformSize: number,
): Promise<Blob> => {
  let bloburl: string | null = null;
  try {
    return await new Promise<Blob>((resolve, reject) => {
      try {
        const img = new Image();

        img.onload = (_e) => {
          try {
            const canvas = document.createElement('canvas');
            if (img.width > img.height) {
              const height = img.height / (img.width / transformSize);
              const width = img.width / (img.height / height);
              canvas.width = width;
              canvas.height = height;
            } else {
              const width = img.width / (img.height / transformSize);
              const height = img.height / (img.width / width);
              canvas.width = width;
              canvas.height = height;
            }
            const context = canvas.getContext('2d');
            if (!context) {
              reject(new Error('Failed to create context'));
              return;
            }
            context.fillStyle = '#FFF';
            context.imageSmoothingEnabled = true;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            context.canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Failed to make preview image'));
                return;
              }
              resolve(blob);
            }, 'image/jpeg');
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () =>
          reject(new Error('Cannot open file: cannot decode image'));

        bloburl = URL.createObjectURL(file);
        img.src = bloburl;
      } catch (err) {
        reject(err);
      }
    });
  } finally {
    if (bloburl) {
      URL.revokeObjectURL(bloburl);
    }
  }
};

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      res(img);
    };
    img.onerror = () => {
      rej(new Error('Failed to load image'));
    };
    img.src = src;
  });
}

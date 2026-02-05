export type ColorRGBA = [number, number, number, number];

export function getColorLightness(color: string): number {
  const color_rgba = colorNameToRGBA(color);
  if (!color_rgba) return 0;
  return (
    (0.2126 * color_rgba[0] + 0.7152 * color_rgba[1] + 0.0722 * color_rgba[2]) /
    255
  );
}

export function isLightColor(color: string) {
  return getColorLightness(color) >= 0.5;
}

const colorToRGBACache: { [color: string]: ColorRGBA } = {};

export function colorNameToRGBA(color: string): ColorRGBA | null {
  if (!color) return null;
  color = color.toString().trim();
  if (!color) return null;
  if (colorToRGBACache.hasOwnProperty(color)) {
    return colorToRGBACache[color];
  }
  let res: ColorRGBA;
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    res = [
      parseInt(color[1] + color[1], 16),
      parseInt(color[2] + color[2], 16),
      parseInt(color[3] + color[3], 16),
      255,
    ];
  } else if (/^#[0-9a-f]{6}$/i.test(color)) {
    res = [
      parseInt(color.substring(1, 3), 16),
      parseInt(color.substring(3, 5), 16),
      parseInt(color.substring(5, 6), 16),
      255,
    ];
  } else if (/^#[0-9a-f]{8}$/i.test(color)) {
    res = [
      parseInt(color.substring(1, 3), 16),
      parseInt(color.substring(3, 5), 16),
      parseInt(color.substring(5, 6), 16),
      parseInt(color.substring(7, 9), 16),
    ];
  } else {
    res = [0, 0, 0, 0];
  }
  colorToRGBACache[color] = res;
  return res;
}

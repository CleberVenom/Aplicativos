import { base64ToBytes } from './base64';

/**
 * Reads width/height from the header of a JPEG or PNG without decoding the image.
 * Returns null when the format is not recognized.
 */
export function imageSizeFromBase64(base64: string): { width: number; height: number } | null {
  // Headers live at the start of the file; ~64 KB covers even large EXIF blocks.
  // 87,380 is a multiple of 4, so the slice is still valid base64.
  const bytes = base64ToBytes(base64.length > 87_380 ? base64.slice(0, 87_380) : base64);

  // PNG: 8-byte signature, then IHDR with width/height as big-endian uint32.
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  // JPEG: walk the markers until a Start Of Frame (SOF0..SOF15, except DHT/JPG/DAC).
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        return {
          height: (bytes[offset + 5] << 8) | bytes[offset + 6],
          width: (bytes[offset + 7] << 8) | bytes[offset + 8],
        };
      }
      offset += 2 + length;
    }
  }
  return null;
}

/** Image format from the first bytes of base64 data (photos are JPEG; providers may return PNG or WebP). */
export function imageTypeFromBase64(base64: string): 'image/jpeg' | 'image/png' | 'image/webp' {
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

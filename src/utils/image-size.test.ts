import { encode } from 'jpeg-js';

import { imageSizeFromBase64, imageTypeFromBase64 } from './image-size';

function pngHeader(width: number, height: number) {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12, 'ascii');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes.toString('base64');
}

describe('imageSizeFromBase64', () => {
  it('reads PNG dimensions', () => {
    expect(imageSizeFromBase64(pngHeader(1536, 1024))).toEqual({ width: 1536, height: 1024 });
  });

  it('reads JPEG dimensions', () => {
    const { data } = encode({ data: new Uint8Array(40 * 24 * 4).fill(128), width: 40, height: 24 }, 80);
    expect(imageSizeFromBase64(Buffer.from(data).toString('base64'))).toEqual({ width: 40, height: 24 });
  });

  it('returns null for unknown formats', () => {
    expect(imageSizeFromBase64(Buffer.from('GIF89a-not-supported').toString('base64'))).toBeNull();
  });
});

describe('imageTypeFromBase64', () => {
  it('detects the format from the file signature', () => {
    expect(imageTypeFromBase64(pngHeader(10, 10))).toBe('image/png');
    expect(imageTypeFromBase64(Buffer.from('RIFF....WEBPVP8 ').toString('base64'))).toBe('image/webp');
    const { data } = encode({ data: new Uint8Array(8 * 8 * 4), width: 8, height: 8 }, 80);
    expect(imageTypeFromBase64(Buffer.from(data).toString('base64'))).toBe('image/jpeg');
  });
});

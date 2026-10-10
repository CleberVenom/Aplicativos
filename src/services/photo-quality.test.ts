import { encode } from 'jpeg-js';

import { buildPhotoCheck, exposureWarnings, measureExposure, validateAsset } from './photo-quality';

function solidJpegBase64(gray: number, size = 16, noise = 0) {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = Math.max(0, Math.min(255, gray + (i % 2 ? noise : -noise)));
    data.set([v, v, v, 255], i * 4);
  }
  const { data: jpeg } = encode({ data, width: size, height: size }, 95);
  return Buffer.from(jpeg).toString('base64');
}

const photo = { uri: 'file:///room.jpg', width: 4032, height: 3024, mimeType: 'image/jpeg', fileSize: 3_000_000, fileName: 'room.jpg' };

describe('validateAsset', () => {
  it('accepts a regular photo', () => {
    expect(validateAsset(photo)).toEqual({ errors: [], warnings: [] });
  });

  it('rejects unsupported formats and videos', () => {
    expect(validateAsset({ ...photo, mimeType: 'image/gif', fileName: 'a.gif' }).errors[0]).toMatch(/Formato não suportado/);
    expect(validateAsset({ ...photo, mimeType: 'video/mp4', fileName: 'a.mp4' }).errors.join(' ')).toMatch(/não um vídeo/);
  });

  it('rejects files that are too large or too small', () => {
    expect(validateAsset({ ...photo, fileSize: 40 * 1024 * 1024 }).errors[0]).toMatch(/muito grande/);
    expect(validateAsset({ ...photo, width: 400, height: 300 }).errors[0]).toMatch(/Resolução muito baixa/);
  });

  it('warns about low resolution and panoramic crops', () => {
    expect(validateAsset({ ...photo, width: 800, height: 600 }).warnings[0]).toMatch(/resolução é baixa/);
    expect(validateAsset({ ...photo, width: 4000, height: 1000 }).warnings[0]).toMatch(/muito estreita/);
  });
});

describe('exposure', () => {
  it('measures brightness and contrast from a JPEG thumbnail', () => {
    const dark = measureExposure(solidJpegBase64(20));
    const bright = measureExposure(solidJpegBase64(240));
    expect(dark.brightness).toBeLessThan(30);
    expect(bright.brightness).toBeGreaterThan(230);
    expect(dark.contrast).toBeLessThan(5);
    expect(measureExposure(solidJpegBase64(128, 16, 60)).contrast).toBeGreaterThan(30);
  });

  it('warns about dark, blown-out and flat photos', () => {
    expect(exposureWarnings({ brightness: 30, contrast: 40 })[0]).toMatch(/muito escura/);
    expect(exposureWarnings({ brightness: 60, contrast: 40 })[0]).toMatch(/um pouco escura/);
    expect(exposureWarnings({ brightness: 240, contrast: 40 })[0]).toMatch(/muito clara/);
    expect(exposureWarnings({ brightness: 128, contrast: 5 })[0]).toMatch(/pouco contraste/);
    expect(exposureWarnings({ brightness: 128, contrast: 40 })).toEqual([]);
  });

  it('combines basic and exposure warnings', () => {
    const check = buildPhotoCheck({ brightness: 30, contrast: 40 }, { errors: [], warnings: ['baixa resolução'] });
    expect(check.warnings).toHaveLength(2);
    expect(check.brightness).toBe(30);
  });
});

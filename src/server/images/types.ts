import type { ImagePayload } from '@/domain/api';

export type EditedImage = {
  base64: string;
  mimeType: string;
  provider: string;
  model: string;
};

/** Image editing capability: transforms a photo according to a text instruction. */
export interface ImageEditProvider {
  readonly provider: string;
  readonly model: string;
  edit(input: { image: ImagePayload; prompt: string; signal?: AbortSignal }): Promise<EditedImage>;
}

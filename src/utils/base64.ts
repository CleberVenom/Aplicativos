/** Decodes base64 (no data-URL prefix) into bytes. Uses the global atob (Hermes, web, Node). */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function stripDataUrl(value: string): { base64: string; mimeType: string | null } {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(value);
  if (!match) return { base64: value, mimeType: null };
  return { mimeType: match[1], base64: match[2] };
}

export function toDataUrl(base64: string, mimeType = 'image/jpeg') {
  return `data:${mimeType};base64,${base64}`;
}

import { AppError, Errors } from '../errors';

/** Maps an HTTP error from an image/3D provider to a user-safe AppError. */
export function providerHttpError(provider: string, status: number): AppError {
  if (status === 401 || status === 403) return Errors.providerAuth(provider);
  if (status === 402) return Errors.providerBilling(provider);
  if (status === 429) return Errors.providerRateLimited(provider);
  if (status >= 500) return Errors.providerUnavailable(provider);
  return Errors.providerRejected(provider);
}

/** fetch wrapper that turns network failures and aborts into AppErrors. */
export async function providerFetch(provider: string, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw Errors.timeout();
    throw Errors.providerUnavailable(provider);
  }
}

export async function readJson(response: Response, provider: string): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw Errors.providerUnavailable(provider);
  }
}

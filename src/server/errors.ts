import type { ApiErrorBody } from '@/domain/api';

/**
 * Error with a stable code, an HTTP status and a pt-BR message that is safe to show
 * to the user. Internal details (provider payloads, keys) never go in `message`.
 */
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 500,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'AppError';
  }

  toBody(): ApiErrorBody {
    return { code: this.code, message: this.message, retryable: this.retryable };
  }
}

export const Errors = {
  badRequest: (message = 'Requisição inválida.') => new AppError('bad_request', message, 400),
  notConfigured: (what: string) =>
    new AppError('not_configured', `Serviço não configurado no servidor: ${what}.`, 503),
  rateLimited: () =>
    new AppError('rate_limited', 'Muitas solicitações em pouco tempo. Aguarde alguns minutos e tente novamente.', 429, true),
  providerRateLimited: (provider: string) =>
    new AppError('provider_rate_limited', `O serviço ${provider} está com limite de uso atingido. Tente novamente em instantes.`, 429, true),
  providerUnavailable: (provider: string) =>
    new AppError('provider_unavailable', `O serviço ${provider} está indisponível no momento. Tente novamente em instantes.`, 503, true),
  providerAuth: (provider: string) =>
    new AppError('provider_auth', `A credencial do serviço ${provider} foi recusada. Verifique a chave configurada no servidor.`, 502),
  providerBilling: (provider: string) =>
    new AppError('provider_billing', `A conta do serviço ${provider} está sem créditos ou com pagamento pendente.`, 502),
  providerRejected: (provider: string) =>
    new AppError('provider_rejected', `O serviço ${provider} não aceitou esta solicitação. Tente outra foto ou ajuste o pedido.`, 422),
  refused: () =>
    new AppError('refused', 'A IA não pôde atender a esta solicitação. Tente reformular ou usar outra foto.', 422),
  incomplete: () =>
    new AppError('incomplete', 'A resposta da IA veio incompleta. Tente novamente.', 502, true),
  invalidOutput: () =>
    new AppError('invalid_output', 'A IA retornou um resultado fora do formato esperado. Tente novamente.', 502, true),
  timeout: () => new AppError('timeout', 'O processamento demorou mais que o esperado. Tente novamente.', 504, true),
  internal: () => new AppError('internal', 'Ocorreu um erro inesperado no servidor.', 500, true),
};

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error && error.name === 'AbortError') return Errors.timeout();
  return Errors.internal();
}

/** Logs without leaking payloads: only code, status and a short message. */
export function logServerError(context: string, error: unknown) {
  const app = error instanceof AppError ? error : null;
  const detail = error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300);
  console.error(`[${context}] ${app?.code ?? 'unexpected'}: ${detail}`);
}

export function jsonError(error: AppError, headers?: HeadersInit): Response {
  return Response.json({ error: error.toBody() }, { status: error.status, headers });
}

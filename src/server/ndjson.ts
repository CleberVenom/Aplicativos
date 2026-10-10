import type { StreamEvent } from '@/domain/api';

import { logServerError, toAppError } from './errors';

type Send = (event: StreamEvent) => void;

/**
 * Streams newline-delimited JSON events. Long AI calls can take minutes; sending
 * periodic heartbeats keeps mobile connections alive (iOS drops idle requests after
 * ~60 s) and lets the app show progress as each result arrives.
 */
export function ndjsonResponse(
  context: string,
  run: (send: Send, signal: AbortSignal) => Promise<void>,
  options: { heartbeatMs?: number } = {},
): Response {
  const encoder = new TextEncoder();
  const abort = new AbortController();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send: Send = (event) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true;
        }
      };
      const heartbeat = setInterval(() => send({ type: 'heartbeat' }), options.heartbeatMs ?? 10_000);

      run(send, abort.signal)
        .catch((error) => {
          logServerError(context, error);
          send({ type: 'error', error: toAppError(error).toBody() });
        })
        .finally(() => {
          clearInterval(heartbeat);
          if (!closed) {
            closed = true;
            try {
              controller.close();
            } catch {
              // already closed by the runtime
            }
          }
        });
    },
    cancel() {
      closed = true;
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}

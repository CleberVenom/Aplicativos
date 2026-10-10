import { handleWorldStart, handleWorldStatus } from '@/server/handlers';

/** Starts a 3D world generation (World Labs) from a proposal image. */
export function POST(request: Request) {
  return handleWorldStart(request);
}

/** Polls the status of a 3D world generation: /api/world?operationId=… */
export function GET(request: Request) {
  return handleWorldStatus(request);
}

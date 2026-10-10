import { handleRefine } from '@/server/handlers';

/** Applies a user adjustment to a proposal. */
export function POST(request: Request) {
  return handleRefine(request);
}

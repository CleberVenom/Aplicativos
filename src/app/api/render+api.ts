import { handleRender } from '@/server/handlers';

/** Generates the visualization image of a proposal from the user's photo. */
export function POST(request: Request) {
  return handleRender(request);
}

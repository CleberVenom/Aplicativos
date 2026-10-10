import { handleProposal } from '@/server/handlers';

/** Re-creates a single proposal (used to retry one that failed). */
export function POST(request: Request) {
  return handleProposal(request);
}

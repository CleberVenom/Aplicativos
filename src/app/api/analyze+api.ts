import { handleAnalyze } from '@/server/handlers';

/** Photo + answers → analysis and three proposals, streamed as NDJSON. */
export function POST(request: Request) {
  return handleAnalyze(request);
}

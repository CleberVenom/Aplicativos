import { handleHealth } from '@/server/handlers';

export function GET() {
  return handleHealth();
}

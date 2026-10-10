import { useLocalSearchParams } from 'expo-router';

import { PROPOSAL_KEYS, type ProposalKey } from '@/domain/design';
import { AdjustScreen } from '@/screens/adjust';

export default function AdjustRoute() {
  const { id, key } = useLocalSearchParams<{ id: string; key: string }>();
  const proposalKey: ProposalKey = (PROPOSAL_KEYS as readonly string[]).includes(key) ? (key as ProposalKey) : 'A';
  return <AdjustScreen id={id} proposalKey={proposalKey} />;
}

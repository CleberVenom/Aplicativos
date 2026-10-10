import { useLocalSearchParams } from 'expo-router';

import { PROPOSAL_KEYS, type ProposalKey } from '@/domain/design';
import { ProposalScreen } from '@/screens/proposal';

export default function ProposalRoute() {
  const { id, key } = useLocalSearchParams<{ id: string; key: string }>();
  const proposalKey: ProposalKey = (PROPOSAL_KEYS as readonly string[]).includes(key) ? (key as ProposalKey) : 'A';
  return <ProposalScreen id={id} proposalKey={proposalKey} />;
}

/** @jest-environment node */
import { sampleAnswers } from '@/test-utils/fixtures';

import { ANALYSIS_SYSTEM, answersBlock, PROPOSAL_SYSTEM, REFINE_SYSTEM } from './prompts';

describe('AI prompts', () => {
  it('send the furniture the user does not have and explain what it means', () => {
    expect(answersBlock(sampleAnswers({ furniture: { Cortinas: 'nao_tenho' } }))).toContain('- Não tenho: Cortinas');
    for (const system of [ANALYSIS_SYSTEM, PROPOSAL_SYSTEM, REFINE_SYSTEM]) {
      expect(system).toMatch(/"Não tenho" indica itens que não existem hoje no ambiente/);
    }
  });
});

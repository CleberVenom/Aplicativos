import { sampleAnswers } from '@/test-utils/fixtures';

import { AnswersSchema, describeAnswers } from './answers';

describe('describeAnswers', () => {
  it('lists each furniture choice with the words used in the questionnaire', () => {
    const answers = sampleAnswers({ furniture: { Sofá: 'manter', Estante: 'reposicionar', Tapete: 'substituir', Cortinas: 'nao_tenho' } });
    expect(AnswersSchema.safeParse(answers).success).toBe(true);
    const rows = Object.fromEntries(describeAnswers(answers).map((r) => [r.label, r.value]));
    expect(rows).toMatchObject({ Manter: 'Sofá', Mover: 'Estante', Trocar: 'Tapete', 'Não tenho': 'Cortinas' });
  });
});

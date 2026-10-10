import { createEmptyAnswers } from './answers';
import {
  firstIncompleteStep,
  getActiveSteps,
  getStepPosition,
  isReadyToGenerate,
  isStepComplete,
  isStepId,
  nextStep,
  prevStep,
} from './questionnaire';

const complete = { ...createEmptyAnswers(), roomType: 'quarto' as const, goals: ['decorar' as const], styles: ['minimalista' as const], budget: 'economico' as const };

describe('adaptive questionnaire', () => {
  it('skips the property step for decoration-only projects', () => {
    expect(getActiveSteps(complete)).not.toContain('property');
    expect(nextStep('preferences', complete)).toBe('review');
    expect(prevStep('review', complete)).toBe('preferences');
  });

  it('asks about the property when the goals involve physical changes or the budget is high', () => {
    expect(getActiveSteps({ ...complete, goals: ['modernizar'] })).toContain('property');
    expect(getActiveSteps({ ...complete, budget: 'elevado' })).toContain('property');
    expect(nextStep('preferences', { ...complete, goals: ['completa'] })).toBe('property');
  });

  it('requires a description when "outro" is chosen', () => {
    expect(isStepComplete('room', { ...complete, roomType: 'outro' })).toBe(false);
    expect(isStepComplete('room', { ...complete, roomType: 'outro', roomTypeOther: '  ' })).toBe(false);
    expect(isStepComplete('room', { ...complete, roomType: 'outro', roomTypeOther: 'Closet' })).toBe(true);
    expect(isStepComplete('style', { ...complete, styles: ['outro'] })).toBe(false);
    expect(isStepComplete('style', { ...complete, styles: ['outro'], styleOther: 'Boho' })).toBe(true);
  });

  it('treats furniture, preferences and property as optional', () => {
    const empty = createEmptyAnswers();
    expect(isStepComplete('furniture', empty)).toBe(true);
    expect(isStepComplete('preferences', empty)).toBe(true);
    expect(isStepComplete('property', empty)).toBe(true);
  });

  it('points to the first missing required step', () => {
    expect(firstIncompleteStep(createEmptyAnswers())).toBe('room');
    expect(firstIncompleteStep({ ...complete, budget: undefined })).toBe('budget');
    expect(isReadyToGenerate(complete)).toBe(true);
  });

  it('reports the position within the active steps', () => {
    const position = getStepPosition('review', complete);
    expect(position.total).toBe(7);
    expect(position.index).toBe(6);
    expect(nextStep('review', complete)).toBeNull();
    expect(prevStep('room', complete)).toBeNull();
  });

  it('validates step ids from the URL', () => {
    expect(isStepId('budget')).toBe(true);
    expect(isStepId('nope')).toBe(false);
    expect(isStepId(undefined)).toBe(false);
  });
});

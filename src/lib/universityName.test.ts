import { describe, expect, it } from 'vitest';
import { formatUniversityName, universitySortKey } from './universityName';

describe('formatUniversityName', () => {
  it('moves a trailing ", The" to the front', () => {
    expect(formatUniversityName('University of Hong Kong, The')).toBe(
      'The University of Hong Kong',
    );
  });

  it('is case-insensitive on the article', () => {
    expect(formatUniversityName('University of Sydney, the')).toBe('The University of Sydney');
  });

  it('handles parenthetical campus names', () => {
    expect(formatUniversityName('University of British Columbia (Okanagan), The')).toBe(
      'The University of British Columbia (Okanagan)',
    );
  });

  it('leaves plain names unchanged', () => {
    expect(formatUniversityName('ETH Zurich')).toBe('ETH Zurich');
    expect(formatUniversityName('Aalto University')).toBe('Aalto University');
  });

  it('leaves a mid-name comma without the article unchanged', () => {
    expect(formatUniversityName('University of California, Berkeley')).toBe(
      'University of California, Berkeley',
    );
  });
});

describe('universitySortKey', () => {
  it('strips a leading "The "', () => {
    expect(universitySortKey('The University of Hong Kong')).toBe('University of Hong Kong');
  });

  it('leaves names without a leading article unchanged', () => {
    expect(universitySortKey('ETH Zurich')).toBe('ETH Zurich');
  });

  it('does not strip "The" that is part of a word', () => {
    expect(universitySortKey('Thessaloniki University')).toBe('Thessaloniki University');
  });
});

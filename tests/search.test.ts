import { describe, expect, it } from 'vitest';
import { rank, score, weightedHaystack } from '../src/lib/search';

describe('search scorer', () => {
  it('scores an exact phrase higher than scattered tokens', () => {
    const exact = score('smart lock', 'Smart lock codes issued on payment');
    const scattered = score('smart lock', 'a lock that is not very smart at all');
    expect(exact).toBeGreaterThan(scattered);
  });

  it('returns 0 when no query token matches', () => {
    expect(score('helicopter', 'guest messaging inbox')).toBe(0);
  });

  it('weightedHaystack repeats high-weight fields', () => {
    const h = weightedHaystack([
      ['title', 3],
      ['body', 1],
    ]);
    expect(h.split(' ').filter((w) => w === 'title')).toHaveLength(3);
  });

  it('rank drops zero-score items and respects the limit', () => {
    const items = ['alpha inbox', 'beta lock', 'gamma climate'];
    const out = rank(items, 'inbox', (s) => s, 5);
    expect(out).toHaveLength(1);
    expect(out[0].item).toBe('alpha inbox');
  });

  it('rank is stable on score ties (preserves input order)', () => {
    const items = ['inbox one', 'inbox two'];
    const out = rank(items, 'inbox', (s) => s, 5);
    expect(out.map((o) => o.item)).toEqual(['inbox one', 'inbox two']);
  });
});

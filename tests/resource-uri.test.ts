import { describe, expect, it } from 'vitest';
import { resourceUriCandidates } from '../src/lib/resource-uri';

describe('resourceUriCandidates', () => {
  it('passes through valid guestway URIs unchanged', () => {
    expect(resourceUriCandidates('guestway://integrations/nest')).toEqual([
      'guestway://integrations/nest',
    ]);
  });

  it('expands a bare integration slug', () => {
    const candidates = resourceUriCandidates('nest');
    expect(candidates[0]).toBe('guestway://integrations/nest');
    expect(candidates).toContain('guestway://solutions/nest');
  });

  it('expands a scheme-less path', () => {
    expect(resourceUriCandidates('integrations/booking-com')).toContain(
      'guestway://integrations/booking-com',
    );
  });

  it('maps static resource names', () => {
    expect(resourceUriCandidates('pricing')).toContain('guestway://pricing');
  });
});

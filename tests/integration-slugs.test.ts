import { describe, expect, it } from 'vitest';
import { resolveIntegrationSlug } from '../src/lib/integration-slugs';

describe('resolveIntegrationSlug', () => {
  it('maps google-nest to nest', () => {
    expect(resolveIntegrationSlug('google-nest')).toBe('nest');
  });

  it('maps booking.com to booking-com', () => {
    expect(resolveIntegrationSlug('booking.com')).toBe('booking-com');
  });

  it('leaves canonical slugs unchanged', () => {
    expect(resolveIntegrationSlug('mews')).toBe('mews');
  });
});

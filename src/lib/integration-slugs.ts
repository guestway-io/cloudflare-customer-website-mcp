/**
 * Marketing integration slugs vs common agent guesses. Agents often pass
 * Academy URL segments (google-nest) or brand punctuation (booking.com)
 * instead of the canonical marketing slug (nest, booking-com).
 */
const SLUG_ALIASES: Record<string, string> = {
  'google-nest': 'nest',
  'google nest': 'nest',
  googlenest: 'nest',
  'booking.com': 'booking-com',
  bookingcom: 'booking-com',
  'trip.com': 'trip-com',
  tripcom: 'trip-com',
  'booking-com': 'booking-com',
};

/** Resolve a user- or agent-supplied slug to the marketing feed slug. */
export function resolveIntegrationSlug(slug: string): string {
  const key = slug.trim().toLowerCase();
  return SLUG_ALIASES[key] ?? key;
}

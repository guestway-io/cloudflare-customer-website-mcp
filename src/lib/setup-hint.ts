/** True when the query sounds like in-product setup, not pre-sales FAQ. */
export function looksLikeProductSetup(query: string): boolean {
  return /\b(connect|setup|set up|configure|install|integrate|link|add|pair|oauth)\b/i.test(
    query,
  );
}

export const SETUP_FAQ_MISS_HINT =
  'No pre-sales FAQ matched this setup question. Call search_docs for ' +
  'Guestway Academy how-to steps, then get_doc on the returned .md URL. ' +
  'get_integration also returns setupDocUrl when an Academy guide exists.';

/**
 * Clients (including Cursor) sometimes call resources/read with a bare slug
 * ("nest") or a path without the guestway:// scheme. The MCP SDK parses the
 * URI with `new URL()` first, which throws "Invalid URL string" before our
 * handlers run. These helpers expand a user-supplied value into valid
 * guestway:// candidates to try in order.
 */

const STATIC_URIS: Record<string, string> = {
  overview: 'guestway://overview',
  catalog: 'guestway://catalog',
  'api-catalog': 'guestway://api-catalog',
  faq: 'guestway://faq',
  integrations: 'guestway://integrations',
  solutions: 'guestway://solutions',
  industries: 'guestway://industries',
  pricing: 'guestway://pricing',
  testimonials: 'guestway://testimonials',
  legal: 'guestway://legal',
};

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Expand one user input into guestway:// URIs to try for resources/read.
 * The first candidate that matches a registered resource wins.
 */
export function resourceUriCandidates(input: string): string[] {
  const raw = input.trim();
  if (!raw) return [];

  if (isValidUrl(raw)) return [raw];

  const seen = new Set<string>();
  const add = (uri: string) => {
    if (!seen.has(uri)) seen.add(uri);
  };

  const bare = raw.replace(/^\/+/, '').replace(/\/+$/, '');

  if (STATIC_URIS[bare]) add(STATIC_URIS[bare]);

  if (bare.includes('/')) {
    add(`guestway://${bare}`);
    const [head, ...rest] = bare.split('/');
    const tail = rest.join('/');
    if (head && tail) add(`guestway://${head}/${tail}`);
  } else {
    // Bare slug: integration list entries are the most common mistaken read.
    add(`guestway://integrations/${bare}`);
    add(`guestway://solutions/${bare}`);
    add(`guestway://faq/${bare}`);
    add(`guestway://industries/${bare}`);
    add(`guestway://legal/${bare}`);
    add(`guestway://skills/${bare}`);
  }

  return [...seen];
}

import { describe, expect, it } from 'vitest';
import { longDocNote, rankDocs } from '../src/lib/doc-search';
import type { DocEntry } from '../src/lib/data';

const INDEX: DocEntry[] = [
  {
    title: 'Guest Journey',
    url: 'https://docs.guestway.io/settings/organization-settings/guest-journey.md',
    description: 'Define pre-arrival, check-in, and post-stay guest experiences.',
  },
  {
    title: 'Automations',
    url: 'https://docs.guestway.io/settings/organization-settings/automations.md',
    description: '',
  },
  {
    title: 'Review Center',
    url: 'https://docs.guestway.io/guestway-platform/review-center.md',
    description: '',
  },
];

describe('doc-search', () => {
  it('ranks Automations first for review + satisfaction automation queries', () => {
    const hits = rankDocs(
      INDEX,
      'automation review request only if satisfied guest',
      3,
    );
    expect(hits[0]?.item.title).toBe('Automations');
    expect(hits[0]?.item.url).toMatch(/\/automations\.md$/);
  });

  it('longDocNote appears only above the threshold', () => {
    expect(longDocNote(7_999)).toBeUndefined();
    expect(longDocNote(8_001)).toMatch(/ask_doc/i);
  });
});

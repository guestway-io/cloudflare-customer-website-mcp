import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  excerptRecentMonths,
  processChangelogBody,
  stripChangelogChrome,
} from '../src/lib/changelog-text';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

describe('changelog-text', () => {
  it('excerptRecentMonths matches Pylon emoji month headers', () => {
    const text =
      '🗓 May 2026: Platform Improvements\n\nNew charges.\n\n' +
      '🗓 April 2026: Platform Improvements\n\nJourney editor.\n\n' +
      '🗓 March 2026: Platform Improvements\n\nAutomation drafts.';
    const excerpt = excerptRecentMonths(text, 2);
    expect(excerpt).toMatch(/May 2026/);
    expect(excerpt).toMatch(/April 2026/);
    expect(excerpt).not.toMatch(/March 2026/);
  });

  it('stripChangelogChrome removes Pylon nav and footer', () => {
    const raw =
      'All Collections\nChangelog\nLast updated 4 days ago\n\n' +
      '🗓 May 2026: Platform Improvements\n\nNew feature.\n\n' +
      'Related Articles\nWhy are messages slow?\nPowered by Pylon';
    const cleaned = stripChangelogChrome(raw);
    expect(cleaned).toMatch(/^🗓 May 2026/);
    expect(cleaned).not.toMatch(/All Collections/);
    expect(cleaned).not.toMatch(/Related Articles/);
    expect(cleaned).not.toMatch(/Powered by Pylon/);
  });

  it('processChangelogBody truncates realistic Pylon HTML', () => {
    const html = readFileSync(
      join(FIXTURES, 'changelog-pylon.html'),
      'utf8',
    );
    const excerpt = processChangelogBody(html, 2);
    expect(excerpt).toMatch(/May 2026/);
    expect(excerpt).toMatch(/April 2026/);
    expect(excerpt).not.toMatch(/March 2026/);
    expect(excerpt).not.toMatch(/February 2026/);
    expect(excerpt).not.toMatch(/Related Articles/);
    expect(excerpt).not.toMatch(/Powered by Pylon/);
  });
});

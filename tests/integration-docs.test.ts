import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseDocsLlmsTxt } from '../src/lib/data';
import { findIntegrationSetupDoc } from '../src/lib/integration-docs';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

describe('findIntegrationSetupDoc', () => {
  const docs = parseDocsLlmsTxt(
    readFileSync(join(FIXTURES, 'docs-llms.txt'), 'utf8'),
  );

  it('maps marketing slug nest to Google Nest Academy page', () => {
    const hit = findIntegrationSetupDoc('nest', 'Nest', docs);
    expect(hit?.url).toMatch(/google-nest\.md$/);
    expect(hit?.title).toBe('Google Nest');
  });

  it('returns null when no Academy integration page exists', () => {
    const hit = findIntegrationSetupDoc(
      'definitely-not-real',
      'Definitely Not Real',
      docs,
    );
    expect(hit).toBeNull();
  });
});

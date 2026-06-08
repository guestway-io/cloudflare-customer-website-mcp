import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildServerIcons, ICON_ASSET_PATHS } from '../src/well-known/icons';
import { buildServerCard } from '../src/well-known/server-card';
import { connectClient } from './helpers';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(HERE, '..', 'public');

describe('MCP server icons', () => {
  it('buildServerIcons points at same-origin asset URLs', () => {
    const icons = buildServerIcons('https://public-mcp.guestway.io');
    expect(icons).toEqual([
      {
        src: 'https://public-mcp.guestway.io/icon-96.png',
        mimeType: 'image/png',
        sizes: ['96x96'],
      },
      {
        src: 'https://public-mcp.guestway.io/icon-48.png',
        mimeType: 'image/png',
        sizes: ['48x48'],
      },
      {
        src: 'https://public-mcp.guestway.io/icon.svg',
        mimeType: 'image/svg+xml',
        sizes: ['any'],
      },
    ]);
  });

  it('server card carries icons at top level and in serverInfo', () => {
    const card = buildServerCard('https://public-mcp.guestway.io');
    const icons = buildServerIcons('https://public-mcp.guestway.io');
    expect(card.icons).toEqual(icons);
    expect(card.serverInfo.icons).toEqual(icons);
  });

  it('initialize result includes server icons', async () => {
    const { client, close } = await connectClient();
    try {
      const result = await client.getServerVersion();
      expect(result).toBeDefined();
      expect(result!.icons).toEqual(
        buildServerIcons('https://public-mcp.guestway.io'),
      );
    } finally {
      await close();
    }
  });

  it('committed icon assets exist for every advertised path', () => {
    for (const path of ICON_ASSET_PATHS) {
      const file = join(PUBLIC, path.replace(/^\//, ''));
      const bytes = readFileSync(file);
      expect(bytes.byteLength).toBeGreaterThan(0);
    }
  });
});

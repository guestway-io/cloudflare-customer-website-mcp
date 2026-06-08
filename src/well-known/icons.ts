/**
 * MCP server icon metadata (SEP-973 / server-card schema). Icons are served
 * from this Worker's origin so clients that enforce same-origin trust accept
 * them without cross-domain warnings.
 */

export const ICON_ASSET_PATHS = [
  '/icon.svg',
  '/icon-48.png',
  '/icon-96.png',
  '/icon-128.png',
] as const;

export type IconAssetPath = (typeof ICON_ASSET_PATHS)[number];

export type McpIcon = {
  src: string;
  mimeType: string;
  sizes: string[];
};

/** Icon descriptors for initialize/server-card metadata. */
export function buildServerIcons(origin: string): McpIcon[] {
  const base = origin.replace(/\/$/, '');
  return [
    {
      src: `${base}/icon-96.png`,
      mimeType: 'image/png',
      sizes: ['96x96'],
    },
    {
      src: `${base}/icon-48.png`,
      mimeType: 'image/png',
      sizes: ['48x48'],
    },
    {
      src: `${base}/icon.svg`,
      mimeType: 'image/svg+xml',
      sizes: ['any'],
    },
  ];
}

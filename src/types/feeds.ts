/**
 * Type mirrors of the marketing site's JSON feed projections.
 *
 * Source of truth: customer-website/src/lib/agent-exports/project.ts. These
 * interfaces are re-declared here (not imported) because the two repos deploy
 * independently. The shapes are stable; the `tests/` snapshots pin them, so a
 * drift on the marketing side surfaces as a failing test here rather than a
 * silent runtime decode error.
 */

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqCategory {
  slug: string;
  title: string;
  short: string;
  order: number;
  /** Routes (beyond /faq) that surface this category's accordion. */
  showOn: string[];
  items: FaqItem[];
}

export interface FaqFeed {
  generatedAt: string;
  source: string;
  totalCategories: number;
  totalQuestions: number;
  categories: FaqCategory[];
}

export type IntegrationStatus = 'live' | 'early' | 'soon';

export interface Integration {
  slug: string;
  name: string;
  category: string;
  status: IntegrationStatus;
  variant?: string;
  description: string;
  order: number;
}

export interface IntegrationCategory {
  id: string;
  label: string;
  short: string;
  order: number;
  blurb: string;
  integrations: Integration[];
}

export interface IntegrationsFeed {
  generatedAt: string;
  source: string;
  total: number;
  liveCount: number;
  earlyCount: number;
  soonCount: number;
  categories: IntegrationCategory[];
}

export interface Solution {
  slug: string;
  title: string;
  category: 'guest-journey' | 'smart-operations';
  url: string;
  menu: { label: string; description: string; order: number };
  seo: { title: string; description: string };
}

export interface SolutionsFeed {
  generatedAt: string;
  source: string;
  total: number;
  solutions: Solution[];
}

export interface Industry {
  slug: string;
  label: string;
  short: string;
  eyebrow: string;
  title: string;
  sub: string;
  url: string;
  order: number;
  bullets: { title: string; body: string }[];
}

export interface IndustriesFeed {
  generatedAt: string;
  source: string;
  total: number;
  industries: Industry[];
}

export interface CatalogLink {
  name: string;
  url: string;
  description: string;
}

export interface CatalogFeed {
  generatedAt: string;
  site: string;
  feeds: CatalogLink[];
  pages: CatalogLink[];
  external: CatalogLink[];
  apps: {
    name: string;
    platform: 'ios' | 'android';
    url: string;
    description: string;
  }[];
  socials: { name: string; url: string }[];
}

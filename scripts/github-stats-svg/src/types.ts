export interface LanguageStat {
  /** Language name (e.g. "TypeScript") */
  name: string;
  /** Hex color code from GitHub Linguist (e.g. "#3178c6") */
  color: string;
  /** Total byte size across repositories */
  size: number;
  /** Percentage of total analyzed language bytes (0-100) */
  percentage: number;
}

export interface TopRepositoryHighlight {
  /** Repository names tied for the top count */
  repos: string[];
  /** Maximum star or fork count */
  count: number;
}

export interface GitHubStats {
  username: string;
  name: string;
  totalStars: number;
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
  contributedTo: number;
  languages: LanguageStat[];
  mostStarred: TopRepositoryHighlight;
  mostForked: TopRepositoryHighlight;
  fetchedAt: string;
}

export type ThemeName =
  | "auto"
  | "light"
  | "dark"
  | "tokyonight"
  | "dracula"
  | "nord";

export interface ThemePalette {
  bg: string;
  bgSubtle: string;
  border: string;
  title: string;
  text: string;
  muted: string;
  icon: string;
  accent: string;
  track: string;
  badgeBg: string;
  badgeText: string;
}

export interface FetchStatsOptions {
  /** GitHub username (login) */
  username: string;
  /** GitHub Personal Access Token or GITHUB_TOKEN */
  token: string;
  /** Include private repositories if token has repo scope (default: true) */
  includePrivate?: boolean;
  /** Language names to exclude (case-insensitive) */
  excludeLanguages?: string[];
  /** Repository names to exclude (case-insensitive) */
  excludeRepos?: string[];
  /** Maximum number of top languages to display (default: 6) */
  maxLanguages?: number;
  /** Maximum GraphQL pagination pages for repositories (default: 5, 100 repos/page) */
  maxPages?: number;
  /** Custom fetch implementation for testing */
  fetchImpl?: typeof fetch;
}

export interface RenderSvgOptions {
  /** Color theme preset. "auto" follows OS/browser prefers-color-scheme (default: "auto") */
  theme?: ThemeName;
  /** Optional partial palette overrides */
  customPalette?: Partial<ThemePalette>;
  /** Custom card title (default: "<name>'s GitHub Stats") */
  title?: string;
  /** Card width in pixels (default: 920) */
  width?: number;
  /** Hide outer card border (default: false) */
  hideBorder?: boolean;
  /** Card corner radius in pixels (default: 12) */
  borderRadius?: number;
  /** Enable subtle entrance animations (default: true) */
  animate?: boolean;
  /** Show updated date in header badge (default: true) */
  showUpdatedDate?: boolean;
}

export interface GenerateOptions extends FetchStatsOptions, RenderSvgOptions {}

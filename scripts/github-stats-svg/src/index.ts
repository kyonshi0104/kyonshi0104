import { fetchGitHubStats } from "./github.js";
import { renderGitHubStatsSvg } from "./svg.js";
import type { GenerateOptions, GitHubStats } from "./types.js";

export {
  aggregateLanguages,
  createDemoStats,
  fetchGitHubStats,
  findTopRepositories,
} from "./github.js";
export { escapeXml, formatNumber, renderGitHubStatsSvg } from "./svg.js";
export { isValidTheme, resolvePalette, THEMES, VALID_THEMES } from "./themes.js";
export type {
  FetchStatsOptions,
  GenerateOptions,
  GitHubStats,
  LanguageStat,
  RenderSvgOptions,
  ThemeName,
  ThemePalette,
  TopRepositoryHighlight,
} from "./types.js";

/**
 * Fetch GitHub stats and render them into an SVG string in one call.
 */
export async function generateGitHubStatsSvg(
  options: GenerateOptions,
): Promise<{ stats: GitHubStats; svg: string }> {
  const stats = await fetchGitHubStats(options);
  const svg = renderGitHubStatsSvg(stats, options);
  return { stats, svg };
}

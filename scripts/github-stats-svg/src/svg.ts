import { resolvePalette } from "./themes.js";
import type {
  GitHubStats,
  LanguageStat,
  RenderSvgOptions,
  ThemePalette,
  TopRepositoryHighlight,
} from "./types.js";

const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/**
 * Escape XML special characters to prevent malformed SVG or injection.
 */
export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Format large numbers compactly (e.g. 12,450 -> "12.5k", 1,284 -> "1,284").
 */
export function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (value >= 10_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return value.toLocaleString("en-US");
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(1, maxChars - 1))}…`;
}

function paletteToCssVars(palette: ThemePalette): string {
  return [
    `--bg: ${palette.bg};`,
    `--bg-subtle: ${palette.bgSubtle};`,
    `--border: ${palette.border};`,
    `--title: ${palette.title};`,
    `--text: ${palette.text};`,
    `--muted: ${palette.muted};`,
    `--icon: ${palette.icon};`,
    `--accent: ${palette.accent};`,
    `--track: ${palette.track};`,
    `--badge-bg: ${palette.badgeBg};`,
    `--badge-text: ${palette.badgeText};`,
  ].join("\n        ");
}

function buildStyleBlock(
  theme: NonNullable<RenderSvgOptions["theme"]>,
  customPalette: RenderSvgOptions["customPalette"],
  animate: boolean,
): string {
  const rootCss =
    theme === "auto"
      ? `
      :root {
        ${paletteToCssVars(resolvePalette("light", customPalette))}
      }
      @media (prefers-color-scheme: dark) {
        :root {
          ${paletteToCssVars(resolvePalette("dark", customPalette))}
        }
      }`
      : `
      :root {
        ${paletteToCssVars(resolvePalette(theme, customPalette))}
      }`;

  const animationCss = animate
    ? `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes growBar {
        from { transform: scaleX(0); }
        to { transform: scaleX(1); }
      }
      .fade {
        opacity: 0;
        animation: fadeIn 0.45s ease-out forwards;
      }
      .bar-anim {
        transform-box: fill-box;
        transform-origin: left center;
        animation: growBar 0.6s ease-out forwards;
      }
      @media (prefers-reduced-motion: reduce) {
        .fade, .bar-anim {
          opacity: 1;
          animation: none;
          transform: none;
        }
      }`
    : `
      .fade { opacity: 1; }
      .bar-anim { transform: none; }`;

  return `
    <style>
      ${rootCss}
      .card-bg { fill: var(--bg); stroke: var(--border); stroke-width: 1; }
      .divider { stroke: var(--border); stroke-width: 1; opacity: 0.7; }
      .title { font: 600 16px ${FONT_FAMILY}; fill: var(--title); }
      .section-label { font: 700 10.5px ${FONT_FAMILY}; fill: var(--title); letter-spacing: 0.08em; }
      .stat-label { font: 400 13px ${FONT_FAMILY}; fill: var(--text); }
      .stat-value { font: 600 13.5px ${FONT_FAMILY}; fill: var(--title); }
      .lang-name { font: 500 12.5px ${FONT_FAMILY}; fill: var(--text); }
      .lang-pct { font: 400 12px ${FONT_FAMILY}; fill: var(--muted); }
      .repo-heading { font: 600 12.5px ${FONT_FAMILY}; fill: var(--title); }
      .repo-count { font: 600 12.5px ${FONT_FAMILY}; fill: var(--accent); }
      .repo-name { font: 400 12.5px ${FONT_FAMILY}; fill: var(--text); }
      .repo-more { font: 400 11.5px ${FONT_FAMILY}; fill: var(--muted); }
      .badge-bg { fill: var(--badge-bg); }
      .badge-text { font: 500 11px ${FONT_FAMILY}; fill: var(--badge-text); }
      .icon { fill: var(--icon); }
      .track { fill: var(--track); }
      .empty-text { font: 400 12.5px ${FONT_FAMILY}; fill: var(--muted); }
      ${animationCss}
    </style>`;
}

interface StatRow {
  label: string;
  value: string;
  iconPath: string;
}

function buildStatRows(stats: GitHubStats): StatRow[] {
  return [
    {
      label: "Total Stars",
      value: formatNumber(stats.totalStars),
      iconPath:
        "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z",
    },
    {
      label: "Total Commits",
      value: formatNumber(stats.totalCommits),
      iconPath:
        "M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z",
    },
    {
      label: "Total PRs",
      value: formatNumber(stats.totalPRs),
      iconPath:
        "M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z",
    },
    {
      label: "Total Issues",
      value: formatNumber(stats.totalIssues),
      iconPath:
        "M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z",
    },
    {
      label: "Contributed to",
      value: formatNumber(stats.contributedTo),
      iconPath:
        "M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8Z",
    },
  ];
}

function renderLanguageBar(
  languages: LanguageStat[],
  x: number,
  y: number,
  barWidth: number,
  barHeight: number,
): string {
  if (languages.length === 0) {
    return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="${barHeight / 2}" class="track" />`;
  }

  const totalPct = languages.reduce((sum, l) => sum + l.percentage, 0) || 100;
  let offsetX = x;
  const segments: string[] = [];

  languages.forEach((lang, index) => {
    const isLast = index === languages.length - 1;
    const rawWidth = (lang.percentage / totalPct) * barWidth;
    const segWidth = isLast
      ? Math.max(0, x + barWidth - offsetX)
      : Math.max(2, rawWidth);

    segments.push(
      `<rect x="${offsetX.toFixed(2)}" y="${y}" width="${segWidth.toFixed(2)}" height="${barHeight}" fill="${escapeXml(lang.color)}" />`,
    );
    offsetX += segWidth;
  });

  return `
    <defs>
      <clipPath id="lang-bar-clip">
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="${barHeight / 2}" />
      </clipPath>
    </defs>
    <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="${barHeight / 2}" class="track" />
    <g clip-path="url(#lang-bar-clip)">
      <g class="bar-anim">
        ${segments.join("\n        ")}
      </g>
    </g>`;
}

const STAR_ICON_PATH =
  "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z";

const FORK_ICON_PATH =
  "M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z";

const MAX_VISIBLE_TIE_REPOS = 2;

function renderTopRepoBlock(params: {
  label: string;
  iconPath: string;
  highlight: TopRepositoryHighlight;
  x: number;
  y: number;
  width: number;
  delay: number;
}): { svg: string; nextY: number } {
  const { label, iconPath, highlight, x, y, width, delay } = params;
  const lineHeight = 19;
  const indentX = x + 16;
  const countText =
    highlight.count > 0 ? formatNumber(highlight.count) : "0";
  const countClass = highlight.count > 0 ? "repo-count" : "repo-more";

  const lines: string[] = [];
  let cursorY = y + 20;

  if (highlight.repos.length === 0) {
    lines.push(`<text x="${indentX}" y="${cursorY}" class="repo-more">—</text>`);
    cursorY += lineHeight;
  } else {
    const visible = highlight.repos.slice(0, MAX_VISIBLE_TIE_REPOS);
    for (const repoName of visible) {
      lines.push(
        `<text x="${indentX}" y="${cursorY}" class="repo-name">${escapeXml(truncateText(repoName, 24))}</text>`,
      );
      cursorY += lineHeight;
    }
    const overflow = highlight.repos.length - visible.length;
    if (overflow > 0) {
      lines.push(
        `<text x="${indentX}" y="${cursorY}" class="repo-more">… (+${overflow} more)</text>`,
      );
      cursorY += lineHeight;
    }
  }

  const svg = `
      <g class="fade" style="animation-delay: ${delay.toFixed(2)}s">
        <svg x="${x}" y="${y - 11}" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <path class="icon" d="${iconPath}" />
        </svg>
        <text x="${x + 20}" y="${y}" class="repo-heading">${escapeXml(label)}</text>
        <text x="${x + width}" y="${y}" text-anchor="end" class="${countClass}">${escapeXml(countText)}</text>
        ${lines.join("\n        ")}
      </g>`;

  return { svg, nextY: cursorY };
}

/**
 * Render an all-in-one GitHub stats, top languages, and top repositories SVG dashboard card.
 */
export function renderGitHubStatsSvg(
  stats: GitHubStats,
  options: RenderSvgOptions = {},
): string {
  const {
    theme = "auto",
    customPalette,
    title = `${stats.name}'s GitHub Stats`,
    width: rawWidth = 920,
    hideBorder = false,
    borderRadius = 12,
    animate = true,
    showUpdatedDate = true,
  } = options;

  const width = Math.max(760, Math.round(rawWidth));
  const padX = 24;
  const dividerGap = 18;
  const usableWidth = width - padX * 2 - dividerGap * 4;
  const leftWidth = Math.round(usableWidth * 0.31);
  const midWidth = Math.round(usableWidth * 0.38);
  const rightWidth = usableWidth - leftWidth - midWidth;

  const divider1X = padX + leftWidth + dividerGap;
  const midX = divider1X + dividerGap;
  const divider2X = midX + midWidth + dividerGap;
  const rightX = divider2X + dividerGap;

  const statRows = buildStatRows(stats);
  const statRowHeight = 29;
  const langRowHeight = 29;
  const langRowsCount = Math.max(1, Math.ceil(stats.languages.length / 2));

  const contentTopY = 76;
  const starredBlock = renderTopRepoBlock({
    label: "Most starred",
    iconPath: STAR_ICON_PATH,
    highlight: stats.mostStarred,
    x: rightX,
    y: contentTopY + 34,
    width: rightWidth,
    delay: 0.14,
  });
  const forkedBlock = renderTopRepoBlock({
    label: "Most forked",
    iconPath: FORK_ICON_PATH,
    highlight: stats.mostForked,
    x: rightX,
    y: starredBlock.nextY + 14,
    width: rightWidth,
    delay: 0.22,
  });

  const leftBottomY = contentTopY + 24 + statRows.length * statRowHeight;
  const midBottomY = contentTopY + 46 + langRowsCount * langRowHeight;
  const rightBottomY = forkedBlock.nextY;
  const height = Math.max(
    252,
    leftBottomY + 14,
    midBottomY + 14,
    rightBottomY + 14,
  );

  const safeTitle = escapeXml(truncateText(title, 54));
  const updatedDate = stats.fetchedAt.slice(0, 10);
  const badgeText = `Updated ${updatedDate}`;
  const badgeWidth = 122;
  const badgeX = width - padX - badgeWidth;

  const statItemsSvg = statRows
    .map((row, idx) => {
      const rowY = contentTopY + 34 + idx * statRowHeight;
      const delay = (0.06 + idx * 0.05).toFixed(2);
      return `
      <g class="fade" style="animation-delay: ${delay}s">
        <svg x="${padX}" y="${rowY - 12}" width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
          <path class="icon" d="${row.iconPath}" />
        </svg>
        <text x="${padX + 24}" y="${rowY}" class="stat-label">${escapeXml(row.label)}</text>
        <text x="${padX + leftWidth}" y="${rowY}" text-anchor="end" class="stat-value">${escapeXml(row.value)}</text>
      </g>`;
    })
    .join("");

  const langColWidth = midWidth / 2;
  const langItemsSvg =
    stats.languages.length === 0
      ? `<text x="${midX}" y="${contentTopY + 62}" class="empty-text">No language data available</text>`
      : stats.languages
          .map((lang, idx) => {
            const col = idx % 2;
            const row = Math.floor(idx / 2);
            const itemX = midX + col * langColWidth;
            const itemY = contentTopY + 62 + row * langRowHeight;
            const delay = (0.12 + idx * 0.05).toFixed(2);
            const label = escapeXml(truncateText(lang.name, 13));
            const pct = `${lang.percentage.toFixed(1)}%`;

            return `
      <g class="fade" style="animation-delay: ${delay}s">
        <circle cx="${(itemX + 5).toFixed(1)}" cy="${itemY - 4}" r="4.5" fill="${escapeXml(lang.color)}" />
        <text x="${(itemX + 16).toFixed(1)}" y="${itemY}" class="lang-name">${label}</text>
        <text x="${(itemX + langColWidth - 10).toFixed(1)}" y="${itemY}" text-anchor="end" class="lang-pct">${pct}</text>
      </g>`;
          })
          .join("");

  const headerBadgeSvg = showUpdatedDate
    ? `
    <g>
      <rect x="${badgeX}" y="19" width="${badgeWidth}" height="22" rx="11" class="badge-bg" />
      <text x="${badgeX + badgeWidth / 2}" y="34" text-anchor="middle" class="badge-text">${escapeXml(badgeText)}</text>
    </g>`
    : "";

  const borderAttr = hideBorder ? ' stroke-opacity="0"' : "";
  const description = escapeXml(
    `GitHub stats for ${stats.username}: ${stats.totalStars} stars, ${stats.totalCommits} commits, ${stats.totalPRs} pull requests, ${stats.totalIssues} issues, contributed to ${stats.contributedTo} repositories.`,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="card-title card-desc">
  <title id="card-title">${safeTitle}</title>
  <desc id="card-desc">${description}</desc>
  ${buildStyleBlock(theme, customPalette, animate)}

  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${borderRadius}" class="card-bg"${borderAttr} />

  <!-- Header -->
  <g>
    <svg x="${padX}" y="20" width="20" height="20" viewBox="0 0 16 16" aria-hidden="true">
      <path class="icon" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
    <text x="${padX + 28}" y="35" class="title">${safeTitle}</text>
    ${headerBadgeSvg}
  </g>

  <line x1="${padX}" y1="56" x2="${width - padX}" y2="56" class="divider" />

  <!-- Left Column: Overview Stats -->
  <g>
    <text x="${padX}" y="${contentTopY}" class="section-label">OVERVIEW</text>
    ${statItemsSvg}
  </g>

  <!-- Middle Column: Top Languages -->
  <g>
    <text x="${midX}" y="${contentTopY}" class="section-label">TOP LANGUAGES</text>
    ${renderLanguageBar(stats.languages, midX, contentTopY + 14, midWidth, 10)}
    ${langItemsSvg}
  </g>

  <!-- Right Column: Top Repositories -->
  <g>
    <text x="${rightX}" y="${contentTopY}" class="section-label">TOP REPOSITORIES</text>
    ${starredBlock.svg}
    ${forkedBlock.svg}
  </g>
</svg>
`;
}

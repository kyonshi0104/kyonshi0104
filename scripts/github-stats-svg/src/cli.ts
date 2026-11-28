#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { createDemoStats, fetchGitHubStats } from "./github.js";
import { renderGitHubStatsSvg } from "./svg.js";
import { isValidTheme, VALID_THEMES } from "./themes.js";
import type { RenderSvgOptions, ThemeName } from "./types.js";

function printHelp(): void {
  console.log(`
github-stats-svg — Generate an all-in-one GitHub stats SVG card for your README.

Usage:
  github-stats-svg [options]

Options:
  -u, --username <login>     GitHub username (env: GITHUB_USERNAME, GITHUB_REPOSITORY_OWNER)
  -t, --token <token>        GitHub token (env: GITHUB_TOKEN, GH_TOKEN)
  -o, --output <path>        Output SVG file path (default: assets/github-stats.svg)
      --theme <name>         Theme: ${VALID_THEMES.join(" | ")} (default: auto)
      --dual                 Generate both -light.svg and -dark.svg for <picture> tags
      --title <text>         Custom card title
      --width <px>           Card width in pixels (default: 920)
      --max-langs <n>        Max number of top languages (default: 6)
      --exclude-langs <csv>  Comma-separated languages to exclude (e.g. "HTML,CSS")
      --exclude-repos <csv>  Comma-separated repository names to exclude
      --public-only          Exclude private repositories and restricted contributions
      --hide-border          Hide card outer border
      --no-animate           Disable SVG CSS animations
      --no-date              Hide the updated date badge
      --demo                 Generate SVG using sample data without calling GitHub API
  -h, --help                 Show this help message
`.trim());
}

function parseCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function deriveDualPaths(basePath: string): { lightPath: string; darkPath: string } {
  const parsed = path.parse(basePath);
  const ext = parsed.ext || ".svg";
  return {
    lightPath: path.join(parsed.dir, `${parsed.name}-light${ext}`),
    darkPath: path.join(parsed.dir, `${parsed.name}-dark${ext}`),
  };
}

async function writeSvgFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  if (dir && dir !== ".") {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(filePath, content, "utf8");
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      username: { type: "string", short: "u" },
      token: { type: "string", short: "t" },
      output: { type: "string", short: "o", default: "assets/github-stats.svg" },
      theme: { type: "string", default: "auto" },
      dual: { type: "boolean", default: false },
      title: { type: "string" },
      width: { type: "string" },
      "max-langs": { type: "string" },
      "exclude-langs": { type: "string" },
      "exclude-repos": { type: "string" },
      "public-only": { type: "boolean", default: false },
      "hide-border": { type: "boolean", default: false },
      "no-animate": { type: "boolean", default: false },
      "no-date": { type: "boolean", default: false },
      demo: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
  });

  if (values.help) {
    printHelp();
    return;
  }

  const themeInput = values.theme ?? "auto";
  if (!isValidTheme(themeInput)) {
    throw new Error(
      `Invalid theme "${themeInput}". Valid themes: ${VALID_THEMES.join(", ")}`,
    );
  }
  const theme: ThemeName = themeInput;

  const width = values.width ? Number(values.width) : undefined;
  if (width !== undefined && (!Number.isFinite(width) || width <= 0)) {
    throw new Error(`Invalid --width value: "${values.width}"`);
  }

  const maxLanguages = values["max-langs"] ? Number(values["max-langs"]) : 6;
  if (!Number.isInteger(maxLanguages) || maxLanguages < 1) {
    throw new Error(`Invalid --max-langs value: "${values["max-langs"]}"`);
  }

  const username =
    values.username ||
    process.env.GITHUB_USERNAME ||
    process.env.GITHUB_REPOSITORY_OWNER ||
    (values.demo ? "octocat" : "");

  const token =
    values.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

  const stats = values.demo
    ? createDemoStats(username || "octocat")
    : await fetchGitHubStats({
        username,
        token,
        includePrivate: !values["public-only"],
        excludeLanguages: parseCsv(values["exclude-langs"]),
        excludeRepos: parseCsv(values["exclude-repos"]),
        maxLanguages,
      });

  const renderOptions: RenderSvgOptions = {
    theme,
    title: values.title,
    width,
    hideBorder: values["hide-border"],
    animate: !values["no-animate"],
    showUpdatedDate: !values["no-date"],
  };

  const outputPath = values.output ?? "assets/github-stats.svg";

  if (values.dual) {
    const { lightPath, darkPath } = deriveDualPaths(outputPath);
    const lightSvg = renderGitHubStatsSvg(stats, {
      ...renderOptions,
      theme: "light",
    });
    const darkSvg = renderGitHubStatsSvg(stats, {
      ...renderOptions,
      theme: "dark",
    });
    await Promise.all([
      writeSvgFile(lightPath, lightSvg),
      writeSvgFile(darkPath, darkSvg),
    ]);
    console.log(`Generated light SVG: ${lightPath}`);
    console.log(`Generated dark SVG:  ${darkPath}`);
  } else {
    const svg = renderGitHubStatsSvg(stats, renderOptions);
    await writeSvgFile(outputPath, svg);
    console.log(`Generated SVG: ${outputPath}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});

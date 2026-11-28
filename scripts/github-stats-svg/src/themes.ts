import type { ThemeName, ThemePalette } from "./types.js";

export const THEMES: Record<Exclude<ThemeName, "auto">, ThemePalette> = {
  light: {
    bg: "#ffffff",
    bgSubtle: "#f6f8fa",
    border: "#d0d7de",
    title: "#1f2328",
    text: "#24292f",
    muted: "#656d76",
    icon: "#0969da",
    accent: "#0969da",
    track: "#eaeef2",
    badgeBg: "#ddf4ff",
    badgeText: "#0969da",
  },
  dark: {
    bg: "#0d1117",
    bgSubtle: "#161b22",
    border: "#30363d",
    title: "#e6edf3",
    text: "#c9d1d9",
    muted: "#8b949e",
    icon: "#58a6ff",
    accent: "#58a6ff",
    track: "#21262d",
    badgeBg: "#1f2d3d",
    badgeText: "#58a6ff",
  },
  tokyonight: {
    bg: "#1a1b27",
    bgSubtle: "#24283b",
    border: "#414868",
    title: "#70a5fd",
    text: "#c0caf5",
    muted: "#787c99",
    icon: "#bb9af7",
    accent: "#7aa2f7",
    track: "#292e42",
    badgeBg: "#292e42",
    badgeText: "#7dcfff",
  },
  dracula: {
    bg: "#282a36",
    bgSubtle: "#303341",
    border: "#44475a",
    title: "#ff79c6",
    text: "#f8f8f2",
    muted: "#9aa2c7",
    icon: "#bd93f9",
    accent: "#50fa7b",
    track: "#44475a",
    badgeBg: "#3b3e52",
    badgeText: "#8be9fd",
  },
  nord: {
    bg: "#2e3440",
    bgSubtle: "#3b4252",
    border: "#4c566a",
    title: "#88c0d0",
    text: "#eceff4",
    muted: "#a5b1c2",
    icon: "#81a1c1",
    accent: "#88c0d0",
    track: "#434c5e",
    badgeBg: "#3b4252",
    badgeText: "#8fbcbb",
  },
};

export const VALID_THEMES: readonly ThemeName[] = [
  "auto",
  "light",
  "dark",
  "tokyonight",
  "dracula",
  "nord",
] as const;

export function isValidTheme(value: string): value is ThemeName {
  return (VALID_THEMES as readonly string[]).includes(value);
}

export function resolvePalette(
  theme: Exclude<ThemeName, "auto">,
  overrides?: Partial<ThemePalette>,
): ThemePalette {
  return {
    ...THEMES[theme],
    ...overrides,
  };
}

import type {
  FetchStatsOptions,
  GitHubStats,
  LanguageStat,
  TopRepositoryHighlight,
} from "./types.js";

const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
const DEFAULT_LANGUAGE_COLOR = "#8b949e";

const USER_STATS_QUERY = /* GraphQL */ `
  query UserStats($login: String!, $after: String) {
    user(login: $login) {
      name
      login
      contributionsCollection {
        totalCommitContributions
        restrictedContributionsCount
      }
      pullRequests(first: 1) {
        totalCount
      }
      openIssues: issues(states: OPEN) {
        totalCount
      }
      closedIssues: issues(states: CLOSED) {
        totalCount
      }
      repositoriesContributedTo(
        first: 1
        contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]
      ) {
        totalCount
      }
      repositories(
        first: 100
        ownerAffiliations: OWNER
        isFork: false
        orderBy: { field: STARGAZERS, direction: DESC }
        after: $after
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          name
          isPrivate
          stargazerCount
          forkCount
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node {
                name
                color
              }
            }
          }
        }
      }
    }
  }
`;

interface GraphQLLanguageEdge {
  size: number;
  node: {
    name: string;
    color: string | null;
  };
}

interface GraphQLRepoNode {
  name: string;
  isPrivate: boolean;
  stargazerCount: number;
  forkCount: number;
  languages: {
    edges: GraphQLLanguageEdge[];
  };
}

interface GraphQLUserResponse {
  data?: {
    user: {
      name: string | null;
      login: string;
      contributionsCollection: {
        totalCommitContributions: number;
        restrictedContributionsCount: number;
      };
      pullRequests: {
        totalCount: number;
      };
      openIssues: {
        totalCount: number;
      };
      closedIssues: {
        totalCount: number;
      };
      repositoriesContributedTo: {
        totalCount: number;
      };
      repositories: {
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
        nodes: GraphQLRepoNode[];
      };
    } | null;
  };
  errors?: Array<{ message: string; type?: string }>;
}

/**
 * Aggregate language byte counts into sorted top-N LanguageStat entries.
 */
export function aggregateLanguages(
  languageMap: Map<string, { size: number; color: string }>,
  maxLanguages = 6,
): LanguageStat[] {
  const entries = Array.from(languageMap.entries())
    .filter(([, info]) => info.size > 0)
    .sort((a, b) => b[1].size - a[1].size);

  const totalSize = entries.reduce((sum, [, info]) => sum + info.size, 0);
  if (totalSize === 0) {
    return [];
  }

  const limit = Math.max(1, maxLanguages);
  const top = entries.slice(0, limit);
  const rest = entries.slice(limit);

  const result: LanguageStat[] = top.map(([name, info]) => ({
    name,
    color: info.color || DEFAULT_LANGUAGE_COLOR,
    size: info.size,
    percentage: Number(((info.size / totalSize) * 100).toFixed(1)),
  }));

  if (rest.length > 0) {
    const otherSize = rest.reduce((sum, [, info]) => sum + info.size, 0);
    const otherPercentage = Number(((otherSize / totalSize) * 100).toFixed(1));
    if (otherPercentage > 0) {
      result.push({
        name: "Other",
        color: DEFAULT_LANGUAGE_COLOR,
        size: otherSize,
        percentage: otherPercentage,
      });
    }
  }

  return result;
}

/**
 * Find repository names tied for the highest positive metric value.
 */
export function findTopRepositories(
  repos: ReadonlyArray<{ name: string; value: number }>,
): TopRepositoryHighlight {
  let max = 0;
  for (const repo of repos) {
    if (repo.value > max) {
      max = repo.value;
    }
  }
  if (max <= 0) {
    return { repos: [], count: 0 };
  }
  const topNames = repos
    .filter((repo) => repo.value === max)
    .map((repo) => repo.name)
    .sort((a, b) => a.localeCompare(b));

  return { repos: topNames, count: max };
}

/**
 * Fetch GitHub user stats and top language distribution via GraphQL API.
 */
export async function fetchGitHubStats(
  options: FetchStatsOptions,
): Promise<GitHubStats> {
  const {
    username,
    token,
    includePrivate = true,
    excludeLanguages = [],
    excludeRepos = [],
    maxLanguages = 6,
    maxPages = 5,
    fetchImpl = fetch,
  } = options;

  if (!username.trim()) {
    throw new Error("username is required.");
  }
  if (!token.trim()) {
    throw new Error(
      "GitHub token is required. Set GITHUB_TOKEN environment variable or pass --token.",
    );
  }

  const excludedLangSet = new Set(
    excludeLanguages.map((lang) => lang.trim().toLowerCase()),
  );
  const excludedRepoSet = new Set(
    excludeRepos.map((repo) => repo.trim().toLowerCase()),
  );

  let cursor: string | null = null;
  let page = 0;
  let resolvedName = username;
  let resolvedLogin = username;
  let totalCommits = 0;
  let totalPRs = 0;
  let totalIssues = 0;
  let contributedTo = 0;
  let totalStars = 0;
  const languageMap = new Map<string, { size: number; color: string }>();
  const repoMetrics: Array<{ name: string; stars: number; forks: number }> = [];

  while (page < maxPages) {
    const response = await fetchImpl(GITHUB_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `bearer ${token}`,
        "User-Agent": "github-stats-svg",
      },
      body: JSON.stringify({
        query: USER_STATS_QUERY,
        variables: {
          login: username,
          after: cursor,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `GitHub GraphQL API request failed (${response.status} ${response.statusText}): ${errorText}`,
      );
    }

    const payload = (await response.json()) as GraphQLUserResponse;
    if (payload.errors && payload.errors.length > 0) {
      const messages = payload.errors.map((e) => e.message).join("; ");
      throw new Error(`GitHub GraphQL API error: ${messages}`);
    }

    const user = payload.data?.user;
    if (!user) {
      throw new Error(`GitHub user "${username}" not found.`);
    }

    if (page === 0) {
      resolvedLogin = user.login;
      resolvedName = user.name?.trim() || user.login;
      totalCommits =
        user.contributionsCollection.totalCommitContributions +
        (includePrivate
          ? user.contributionsCollection.restrictedContributionsCount
          : 0);
      totalPRs = user.pullRequests.totalCount;
      totalIssues = user.openIssues.totalCount + user.closedIssues.totalCount;
      contributedTo = user.repositoriesContributedTo.totalCount;
    }

    for (const repo of user.repositories.nodes) {
      if (!includePrivate && repo.isPrivate) {
        continue;
      }
      if (excludedRepoSet.has(repo.name.toLowerCase())) {
        continue;
      }

      totalStars += repo.stargazerCount;
      repoMetrics.push({
        name: repo.name,
        stars: repo.stargazerCount,
        forks: repo.forkCount,
      });

      for (const edge of repo.languages.edges) {
        const langName = edge.node.name;
        if (excludedLangSet.has(langName.toLowerCase())) {
          continue;
        }
        const existing = languageMap.get(langName);
        if (existing) {
          existing.size += edge.size;
        } else {
          languageMap.set(langName, {
            size: edge.size,
            color: edge.node.color || DEFAULT_LANGUAGE_COLOR,
          });
        }
      }
    }

    page += 1;
    if (
      !user.repositories.pageInfo.hasNextPage ||
      !user.repositories.pageInfo.endCursor
    ) {
      break;
    }
    cursor = user.repositories.pageInfo.endCursor;
  }

  return {
    username: resolvedLogin,
    name: resolvedName,
    totalStars,
    totalCommits,
    totalPRs,
    totalIssues,
    contributedTo,
    languages: aggregateLanguages(languageMap, maxLanguages),
    mostStarred: findTopRepositories(
      repoMetrics.map((r) => ({ name: r.name, value: r.stars })),
    ),
    mostForked: findTopRepositories(
      repoMetrics.map((r) => ({ name: r.name, value: r.forks })),
    ),
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Sample stats for offline previewing and testing.
 */
export function createDemoStats(username = "octocat"): GitHubStats {
  return {
    username,
    name: username === "octocat" ? "The Octocat" : username,
    totalStars: 1284,
    totalCommits: 942,
    totalPRs: 138,
    totalIssues: 64,
    contributedTo: 27,
    languages: [
      { name: "TypeScript", color: "#3178c6", size: 482000, percentage: 46.8 },
      { name: "Rust", color: "#dea584", size: 215000, percentage: 20.9 },
      { name: "Python", color: "#3572A5", size: 154000, percentage: 15.0 },
      { name: "Go", color: "#00ADD8", size: 92000, percentage: 8.9 },
      { name: "CSS", color: "#563d7c", size: 51000, percentage: 5.0 },
      { name: "Other", color: "#8b949e", size: 35000, percentage: 3.4 },
    ],
    mostStarred: {
      repos: ["github-stats-svg"],
      count: 482,
    },
    mostForked: {
      repos: ["github-stats-svg", "awesome-cli-kit"],
      count: 64,
    },
    fetchedAt: new Date().toISOString(),
  };
}

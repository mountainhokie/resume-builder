/**
 * ATS platform detection.
 *
 * Learned field mappings are keyed by platform where one is recognised, so a
 * field taught at one employer applies at every other employer on the same
 * platform. This matters most for Workday and iCIMS, which give each customer
 * its own subdomain — host-keyed mappings there would have to be re-taught at
 * every single company.
 *
 * The extension consumes this list from /api/ext/platforms so adding a
 * platform is a server-side change and does not require an extension release.
 */

export const ATS_PLATFORMS = [
  "linkedin",
  "builtin",
  "greenhouse",
  "lever",
  "ashby",
  "workday",
  "icims",
] as const;

export type AtsPlatform = (typeof ATS_PLATFORMS)[number];

/**
 * Rules are plain data rather than predicate functions so the whole table can
 * be serialised to the extension from /api/ext/platforms. Adding a platform is
 * then a server-side change that needs no extension release.
 */
export type PlatformRule = {
  platform: AtsPlatform;
  label: string;
  /** Matches the host itself or any subdomain of it. */
  suffixes: string[];
  /** Escape hatch for families that a suffix cannot express. */
  pattern?: string;
  /** URL match patterns for the extension manifest's host permissions. */
  matches: string[];
};

const endsWith = (host: string, suffix: string) =>
  host === suffix || host.endsWith(`.${suffix}`);

export const PLATFORM_RULES: PlatformRule[] = [
  {
    platform: "linkedin",
    label: "LinkedIn",
    suffixes: ["linkedin.com"],
    matches: ["*://*.linkedin.com/*"],
  },
  {
    platform: "builtin",
    label: "Built In",
    // Built In runs a family of city domains alongside the main one.
    suffixes: [],
    pattern: "(^|\\.)builtin([a-z]+)?\\.(com|org)$",
    matches: ["*://*.builtin.com/*", "*://*.builtinnyc.com/*"],
  },
  {
    platform: "greenhouse",
    label: "Greenhouse",
    suffixes: ["greenhouse.io"],
    matches: ["*://*.greenhouse.io/*"],
  },
  {
    platform: "lever",
    label: "Lever",
    suffixes: ["lever.co"],
    matches: ["*://*.lever.co/*"],
  },
  {
    platform: "ashby",
    label: "Ashby",
    suffixes: ["ashbyhq.com"],
    matches: ["*://*.ashbyhq.com/*"],
  },
  {
    platform: "workday",
    label: "Workday",
    // Per-tenant subdomains: acme.wd5.myworkdayjobs.com
    suffixes: ["myworkdayjobs.com", "myworkdaysite.com"],
    matches: ["*://*.myworkdayjobs.com/*", "*://*.myworkdaysite.com/*"],
  },
  {
    platform: "icims",
    label: "iCIMS",
    suffixes: ["icims.com"],
    matches: ["*://*.icims.com/*"],
  },
];

function ruleMatches(rule: PlatformRule, host: string): boolean {
  if (rule.suffixes.some((s) => endsWith(host, s))) return true;
  return rule.pattern ? new RegExp(rule.pattern).test(host) : false;
}

export function detectPlatform(hostOrUrl: string): AtsPlatform | null {
  const host = normalizeHost(hostOrUrl);
  if (!host) return null;
  return PLATFORM_RULES.find((rule) => ruleMatches(rule, host))?.platform ?? null;
}

export function platformLabel(platform: AtsPlatform): string {
  return PLATFORM_RULES.find((r) => r.platform === platform)?.label ?? platform;
}

export function normalizeHost(hostOrUrl: string): string {
  const raw = hostOrUrl.trim().toLowerCase();
  if (!raw) return "";
  let host = raw;
  if (raw.includes("://")) {
    try {
      host = new URL(raw).hostname;
    } catch {
      return "";
    }
  }
  return host.replace(/^www\./, "");
}

export type MappingScope = {
  scope: string;
  scopeType: "platform" | "host";
};

/**
 * The scope a newly learned mapping is stored under: the platform when one is
 * recognised, otherwise the bare hostname.
 */
export function scopeForHost(hostOrUrl: string): MappingScope {
  const platform = detectPlatform(hostOrUrl);
  if (platform) return { scope: platform, scopeType: "platform" };
  return { scope: normalizeHost(hostOrUrl), scopeType: "host" };
}

/**
 * Every scope a lookup should consider for a page, most specific first.
 * On a recognised platform this is [host, platform] so a company-specific
 * override can beat the platform-wide default.
 */
export function lookupScopes(hostOrUrl: string): MappingScope[] {
  const host = normalizeHost(hostOrUrl);
  const platform = detectPlatform(host);
  const scopes: MappingScope[] = [{ scope: host, scopeType: "host" }];
  if (platform) scopes.push({ scope: platform, scopeType: "platform" });
  return scopes;
}

import { NextResponse } from "next/server";

/**
 * CORS for the extension's service worker.
 *
 * MV3 service workers can often reach a host they hold permissions for without
 * a preflight, but that is not guaranteed across Chrome versions or request
 * shapes. Explicit headers keyed to the extension id keep it deterministic —
 * and keep the API closed to every other origin.
 *
 * EXTENSION_ID accepts a comma-separated list so an unpacked development build
 * and the published build can both be allowed.
 */
function allowedOrigins(): string[] {
  const ids = (process.env.EXTENSION_ID ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.map((id) =>
    id.startsWith("chrome-extension://") ? id : `chrome-extension://${id}`
  );
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins().includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** Attaches CORS headers to a response built elsewhere. */
export function withCors<T extends NextResponse>(
  response: T,
  request: Request
): T {
  for (const [key, value] of Object.entries(corsHeaders(request))) {
    response.headers.set(key, value);
  }
  return response;
}

export function corsJson(
  body: unknown,
  request: Request,
  init?: ResponseInit
): NextResponse {
  return withCors(NextResponse.json(body, init), request);
}

/** Shared OPTIONS handler for the /api/ext routes. */
export function handlePreflight(request: Request): NextResponse {
  return withCors(new NextResponse(null, { status: 204 }) as NextResponse, request);
}

/**
 * The redirect target chrome.identity.launchWebAuthFlow listens on. Validated
 * strictly so the authorization code can only ever be handed to our extension.
 */
export function isAllowedExtensionRedirect(redirectUri: string): boolean {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (!url.hostname.endsWith(".chromiumapp.org")) return false;

  const ids = (process.env.EXTENSION_ID ?? "")
    .split(",")
    .map((id) => id.trim().replace(/^chrome-extension:\/\//, ""))
    .filter(Boolean);
  // With no id configured yet, accept any chromiumapp.org host so the flow can
  // be exercised during development before the extension key is pinned.
  if (!ids.length) return true;
  return ids.some((id) => url.hostname === `${id}.chromiumapp.org`);
}

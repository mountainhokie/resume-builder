import { PLATFORM_RULES } from "@/lib/ats-platforms";
import { corsJson, handlePreflight } from "@/lib/ext-cors";

export async function OPTIONS(request: Request) {
  return handlePreflight(request);
}

/**
 * Platform detection rules, served as data.
 *
 * The extension caches this rather than embedding its own copy, so supporting a
 * new ATS is a server deploy instead of a Web Store review cycle. Unauthenticated
 * on purpose — it is a static list with nothing user-specific in it.
 */
export async function GET(request: Request) {
  return corsJson({ platforms: PLATFORM_RULES }, request);
}

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { applicationAnswers, fieldMappings } from "@/lib/schema";
import { getAuthedProfile } from "@/lib/auth-helpers";
import { corsJson, handlePreflight } from "@/lib/ext-cors";
import { normalizeHost, scopeForHost } from "@/lib/ats-platforms";
import { ALL_ANSWER_KEYS } from "@/lib/application-answers";

export async function OPTIONS(request: Request) {
  return handlePreflight(request);
}

type MappingBody = {
  url?: string;
  fieldFingerprint?: string;
  answerKey?: string;
  label?: string;
  selector?: string;
  /** Set when replaying an existing mapping, to bump usage stats. */
  used?: boolean;
};

/**
 * Records a field the user has taught the extension about — the "add new
 * fields as I find them" path.
 *
 * The scope is derived server-side from the page URL so the extension cannot
 * accidentally write a mapping under the wrong platform, and so scoping rules
 * can change without an extension release.
 */
export async function POST(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx)
      return corsJson({ error: "Unauthorized" }, request, { status: 401 });

    const body = (await request.json()) as MappingBody;
    const fingerprint = body.fieldFingerprint?.trim();
    const answerKey = body.answerKey?.trim();
    const host = normalizeHost(body.url ?? "");

    if (!fingerprint || !answerKey || !host) {
      return corsJson(
        { error: "url, fieldFingerprint and answerKey are required" },
        request,
        { status: 400 }
      );
    }

    // The key must resolve to something fillable, otherwise the mapping is
    // dead weight that silently never matches.
    const known =
      ALL_ANSWER_KEYS.includes(answerKey) ||
      (
        await db
          .select({ id: applicationAnswers.id })
          .from(applicationAnswers)
          .where(
            and(
              eq(applicationAnswers.profileId, ctx.profile.id),
              eq(applicationAnswers.key, answerKey)
            )
          )
          .limit(1)
      ).length > 0;
    if (!known) {
      return corsJson({ error: "Unknown answerKey" }, request, { status: 400 });
    }

    const { scope, scopeType } = scopeForHost(host);
    const saved = await db
      .insert(fieldMappings)
      .values({
        profileId: ctx.profile.id,
        scope,
        scopeType,
        host,
        fieldFingerprint: fingerprint,
        answerKey,
        label: body.label ?? null,
        selector: body.selector ?? null,
        timesUsed: body.used ? 1 : 0,
        lastUsedAt: body.used ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [
          fieldMappings.profileId,
          fieldMappings.scope,
          fieldMappings.fieldFingerprint,
        ],
        // field_mappings_owned_idx is partial; without the predicate Postgres
        // cannot infer which index this conflict targets and errors outright.
        targetWhere: sql`${fieldMappings.profileId} IS NOT NULL`,
        set: {
          answerKey,
          label: body.label ?? null,
          selector: body.selector ?? null,
          timesUsed: sql`${fieldMappings.timesUsed} + ${body.used ? 1 : 0}`,
          lastUsedAt: body.used ? new Date() : sql`${fieldMappings.lastUsedAt}`,
        },
      })
      .returning();

    return corsJson({ mapping: saved[0] }, request);
  } catch (error) {
    console.error("Error saving field mapping:", error);
    return corsJson({ error: "Failed to save mapping" }, request, {
      status: 500,
    });
  }
}

/** Forgets a mapping the user no longer wants applied. Curated rows are
 *  untouched — the WHERE clause is scoped to the caller's own profile. */
export async function DELETE(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx)
      return corsJson({ error: "Unauthorized" }, request, { status: 401 });

    const params = new URL(request.url).searchParams;
    const fingerprint = params.get("fieldFingerprint") ?? "";
    const host = normalizeHost(params.get("url") ?? "");
    if (!fingerprint || !host) {
      return corsJson(
        { error: "url and fieldFingerprint are required" },
        request,
        { status: 400 }
      );
    }

    const { scope } = scopeForHost(host);
    await db
      .delete(fieldMappings)
      .where(
        and(
          eq(fieldMappings.profileId, ctx.profile.id),
          eq(fieldMappings.scope, scope),
          eq(fieldMappings.fieldFingerprint, fingerprint)
        )
      );
    return corsJson({ success: true }, request);
  } catch (error) {
    console.error("Error deleting field mapping:", error);
    return corsJson({ error: "Failed to delete mapping" }, request, {
      status: 500,
    });
  }
}

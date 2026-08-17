import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { applicationAnswers, fieldMappings } from "@/lib/schema";
import { getAuthedProfile } from "@/lib/auth-helpers";
import { corsJson, handlePreflight } from "@/lib/ext-cors";
import {
  PROFILE_DERIVED_ANSWERS,
  type AnswerSeed,
} from "@/lib/application-answers";
import {
  detectPlatform,
  lookupScopes,
  normalizeHost,
} from "@/lib/ats-platforms";
import type { Profile } from "@/lib/schema";

export async function OPTIONS(request: Request) {
  return handlePreflight(request);
}

type ResolvedAnswer = {
  key: string;
  label: string;
  value: string;
  valueType: string;
  synonyms: string[];
  isSensitive: boolean;
  source: "profile" | "library";
};

/**
 * Everything the fill engine needs for one page, in a single call:
 * the answer library, and the mappings that apply to this host.
 *
 * Identity answers are resolved from the profile rather than stored twice, so
 * editing your profile keeps autofill correct with nothing to sync.
 */
export async function GET(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx)
      return corsJson({ error: "Unauthorized" }, request, { status: 401 });

    const pageUrl = new URL(request.url).searchParams.get("url") ?? "";
    const host = normalizeHost(pageUrl);
    const platform = host ? detectPlatform(host) : null;

    const stored = await db
      .select()
      .from(applicationAnswers)
      .where(eq(applicationAnswers.profileId, ctx.profile.id));

    const answers: ResolvedAnswer[] = [
      ...profileAnswers(ctx.profile),
      ...stored.map((a) => ({
        key: a.key,
        label: a.label,
        value: a.value ?? "",
        valueType: a.valueType,
        synonyms: a.synonyms ?? [],
        isSensitive: a.isSensitive,
        source: "library" as const,
      })),
    ].filter((a) => a.value !== "");

    // Own mappings first, then the curated tier; within each, host beats
    // platform. The extension applies them in the order returned.
    const scopes = host ? lookupScopes(host).map((s) => s.scope) : [];
    const mappings = scopes.length
      ? await db
          .select()
          .from(fieldMappings)
          .where(
            and(
              inArray(fieldMappings.scope, scopes),
              or(
                eq(fieldMappings.profileId, ctx.profile.id),
                isNull(fieldMappings.profileId)
              )
            )
          )
      : [];

    const ranked = mappings
      .map((m) => ({
        fieldFingerprint: m.fieldFingerprint,
        answerKey: m.answerKey,
        scope: m.scope,
        scopeType: m.scopeType,
        label: m.label,
        source: m.profileId ? ("own" as const) : ("curated" as const),
      }))
      .sort((a, b) => rank(a) - rank(b));

    return corsJson({ host, platform, answers, mappings: ranked }, request);
  } catch (error) {
    console.error("Error building autofill profile:", error);
    return corsJson({ error: "Failed to load autofill data" }, request, {
      status: 500,
    });
  }
}

function rank(m: { source: "own" | "curated"; scopeType: string }): number {
  const ownership = m.source === "own" ? 0 : 2;
  const specificity = m.scopeType === "host" ? 0 : 1;
  return ownership + specificity;
}

function profileAnswers(profile: Profile): ResolvedAnswer[] {
  const values: Record<string, string> = {
    first_name: profile.firstName ?? "",
    last_name: profile.lastName ?? "",
    full_name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    address: profile.address ?? "",
    linkedin: profile.linkedin ?? "",
    github: profile.github ?? "",
    portfolio: profile.portfolio ?? "",
  };

  return PROFILE_DERIVED_ANSWERS.map((seed: AnswerSeed) => ({
    key: seed.key,
    label: seed.label,
    value: values[seed.key] ?? "",
    valueType: seed.valueType,
    synonyms: seed.synonyms,
    isSensitive: false,
    source: "profile" as const,
  }));
}

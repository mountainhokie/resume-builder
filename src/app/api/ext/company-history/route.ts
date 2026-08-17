import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs } from "@/lib/schema";
import { getAuthedProfile } from "@/lib/auth-helpers";
import { corsJson, handlePreflight } from "@/lib/ext-cors";
import { compareCompanies } from "@/lib/company-match";

export async function OPTIONS(request: Request) {
  return handlePreflight(request);
}

/**
 * Prior applications to a company, whatever became of them.
 *
 * Status is deliberately ignored: knowing you were rejected there last year is
 * as useful as knowing you have an open application, and arguably more so.
 *
 * Matching runs in JavaScript rather than SQL because the normalisation —
 * folding accents, dropping legal suffixes — has no clean SQL equivalent and
 * would drift from the rest of the app if it were duplicated. One person's job
 * list is small enough that reading it back is cheaper than the alternative;
 * only the columns the panel shows are selected.
 */
export async function GET(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx)
      return corsJson({ error: "Unauthorized" }, request, { status: 401 });

    const company = (
      new URL(request.url).searchParams.get("company") ?? ""
    ).trim();
    if (!company) {
      return corsJson(
        { company: "", matches: [], counts: { exact: 0, similar: 0 } },
        request
      );
    }

    const rows = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        company: jobs.company,
        status: jobs.status,
        url: jobs.url,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .where(eq(jobs.profileId, ctx.profile.id))
      .orderBy(desc(jobs.createdAt));

    const matches = [];
    for (const row of rows) {
      const kind = compareCompanies(company, row.company ?? "");
      if (!kind) continue;
      matches.push({
        id: row.id,
        title: row.title,
        company: row.company,
        status: row.status,
        url: row.url,
        appliedAt: row.createdAt,
        match: kind,
      });
    }

    // Certain matches first; a "similar" name is a prompt to look, not a fact.
    matches.sort((a, b) =>
      a.match === b.match ? 0 : a.match === "exact" ? -1 : 1
    );

    return corsJson(
      {
        company,
        matches,
        counts: {
          exact: matches.filter((m) => m.match === "exact").length,
          similar: matches.filter((m) => m.match === "similar").length,
        },
      },
      request
    );
  } catch (error) {
    console.error("Error looking up company history:", error);
    return corsJson({ error: "Failed to check company history" }, request, {
      status: 500,
    });
  }
}

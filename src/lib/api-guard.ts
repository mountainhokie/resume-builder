import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs } from "@/lib/schema";

/**
 * Removes fields a client must never set on a write.
 *
 * Every POST/PUT handler previously spread the request body straight into the
 * query, which made `profileId` caller-controlled — a request could write rows
 * into somebody else's account. Ownership is now always taken from the session
 * and merged in after this strip.
 */
export function sanitizeBody<T>(body: unknown): T {
  /* eslint-disable @typescript-eslint/no-unused-vars -- destructured to discard */
  const {
    id: _id,
    profileId: _profileId,
    userId: _userId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...rest
  } = (body ?? {}) as Record<string, unknown>;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  return rest as T;
}

/**
 * Confirms a job belongs to the given profile.
 *
 * Used wherever a record hangs off a job rather than off the profile directly
 * (interviews), and to stop a resume or cover letter being attached to someone
 * else's job by passing a foreign jobId.
 */
export async function ownsJob(
  jobId: string,
  profileId: string
): Promise<boolean> {
  const rows = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.profileId, profileId)))
    .limit(1);
  return rows.length > 0;
}

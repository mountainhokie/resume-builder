import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { coverLetterTemplates } from "@/lib/schema";

/**
 * Clears the current default template for a profile.
 *
 * At most one row per profile may have is_default set, enforced by a partial
 * unique index, so the incumbent has to be cleared before another claims it.
 */
export async function clearDefaultTemplate(
  profileId: string,
  exceptId?: string
) {
  const conditions = [
    eq(coverLetterTemplates.profileId, profileId),
    eq(coverLetterTemplates.isDefault, true),
  ];
  if (exceptId) conditions.push(ne(coverLetterTemplates.id, exceptId));
  await db
    .update(coverLetterTemplates)
    .set({ isDefault: false })
    .where(and(...conditions));
}

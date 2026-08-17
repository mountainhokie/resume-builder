import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { extRefreshTokens } from "@/lib/schema";
import { hashToken } from "@/lib/ext-tokens";
import { corsJson, handlePreflight } from "@/lib/ext-cors";

export async function OPTIONS(request: Request) {
  return handlePreflight(request);
}

/** Signs the extension out on this device. Always reports success so the
 *  endpoint cannot be used to probe which tokens exist. */
export async function POST(request: Request) {
  try {
    const { refresh_token: presented } = (await request.json()) as {
      refresh_token?: string;
    };
    if (presented) {
      await db
        .update(extRefreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(extRefreshTokens.tokenHash, hashToken(presented)),
            isNull(extRefreshTokens.revokedAt)
          )
        );
    }
    return corsJson({ success: true }, request);
  } catch (error) {
    console.error("Error revoking extension token:", error);
    return corsJson({ success: true }, request);
  }
}

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { extRefreshTokens } from "@/lib/schema";
import {
  REFRESH_TOKEN_TTL_DAYS,
  accessTokenTtlSeconds,
  generateOpaqueToken,
  hashToken,
  signExtAccessToken,
} from "@/lib/ext-tokens";
import { corsJson, handlePreflight } from "@/lib/ext-cors";

export async function OPTIONS(request: Request) {
  return handlePreflight(request);
}

/**
 * Trades a refresh token for a fresh access token.
 *
 * Refresh tokens rotate: the presented token is revoked and a new one issued.
 * A token that is replayed after rotation therefore fails, which surfaces
 * theft instead of letting a copied token stay valid for its full 60 days.
 */
export async function POST(request: Request) {
  try {
    const { refresh_token: presented } = (await request.json()) as {
      refresh_token?: string;
    };
    if (!presented) {
      return corsJson({ error: "refresh_token is required" }, request, {
        status: 400,
      });
    }

    const rows = await db
      .select()
      .from(extRefreshTokens)
      .where(
        and(
          eq(extRefreshTokens.tokenHash, hashToken(presented)),
          isNull(extRefreshTokens.revokedAt)
        )
      )
      .limit(1);

    const record = rows[0];
    if (!record || record.expiresAt.getTime() < Date.now()) {
      return corsJson({ error: "invalid_grant" }, request, { status: 401 });
    }

    const rotated = generateOpaqueToken();
    const now = new Date();

    // Revoke first, conditioned on it still being live, so two concurrent
    // refreshes cannot both mint a successor.
    const revoked = await db
      .update(extRefreshTokens)
      .set({ revokedAt: now, lastUsedAt: now })
      .where(
        and(
          eq(extRefreshTokens.id, record.id),
          isNull(extRefreshTokens.revokedAt)
        )
      )
      .returning({ id: extRefreshTokens.id });
    if (!revoked.length) {
      return corsJson({ error: "invalid_grant" }, request, { status: 401 });
    }

    await db.insert(extRefreshTokens).values({
      userId: record.userId,
      tokenHash: hashToken(rotated),
      deviceLabel: record.deviceLabel,
      expiresAt: new Date(
        Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
      ),
    });

    return corsJson(
      {
        token_type: "Bearer",
        access_token: await signExtAccessToken(record.userId),
        expires_in: accessTokenTtlSeconds,
        refresh_token: rotated,
      },
      request
    );
  } catch (error) {
    console.error("Error refreshing extension token:", error);
    return corsJson({ error: "server_error" }, request, { status: 500 });
  }
}

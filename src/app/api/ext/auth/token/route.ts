import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { extAuthCodes, extRefreshTokens, users } from "@/lib/schema";
import {
  REFRESH_TOKEN_TTL_DAYS,
  accessTokenTtlSeconds,
  generateOpaqueToken,
  hashToken,
  signExtAccessToken,
  verifyPkceChallenge,
} from "@/lib/ext-tokens";
import { corsJson, handlePreflight } from "@/lib/ext-cors";
import { getOrCreateProfile } from "@/lib/auth-helpers";

export async function OPTIONS(request: Request) {
  return handlePreflight(request);
}

/**
 * Exchanges a one-time authorization code for an access/refresh token pair.
 *
 * The PKCE verifier is what makes this safe: an intercepted code cannot be
 * redeemed without the verifier, which never leaves the extension.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      code_verifier?: string;
      device_label?: string;
    };
    const { code, code_verifier: verifier } = body;
    if (!code || !verifier) {
      return corsJson(
        { error: "code and code_verifier are required" },
        request,
        { status: 400 }
      );
    }

    const rows = await db
      .select()
      .from(extAuthCodes)
      .where(
        and(
          eq(extAuthCodes.codeHash, hashToken(code)),
          isNull(extAuthCodes.consumedAt)
        )
      )
      .limit(1);

    const record = rows[0];
    if (!record || record.expiresAt.getTime() < Date.now()) {
      return corsJson({ error: "invalid_grant" }, request, { status: 400 });
    }
    if (
      !verifyPkceChallenge(
        verifier,
        record.codeChallenge,
        record.codeChallengeMethod
      )
    ) {
      return corsJson({ error: "invalid_grant" }, request, { status: 400 });
    }

    // Single use — burn it before issuing anything.
    const consumed = await db
      .update(extAuthCodes)
      .set({ consumedAt: new Date() })
      .where(
        and(eq(extAuthCodes.id, record.id), isNull(extAuthCodes.consumedAt))
      )
      .returning({ id: extAuthCodes.id });
    if (!consumed.length) {
      // Lost a race against a concurrent redemption.
      return corsJson({ error: "invalid_grant" }, request, { status: 400 });
    }

    // Make sure a profile exists before the extension starts calling data
    // endpoints, so the first capture does not race profile creation.
    const account = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, record.userId))
      .limit(1);
    await getOrCreateProfile(
      record.userId,
      account[0]?.email,
      account[0]?.name
    );

    const refreshToken = generateOpaqueToken();
    await db.insert(extRefreshTokens).values({
      userId: record.userId,
      tokenHash: hashToken(refreshToken),
      deviceLabel: body.device_label?.slice(0, 200) ?? null,
      expiresAt: new Date(
        Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
      ),
    });

    return corsJson(
      {
        token_type: "Bearer",
        access_token: await signExtAccessToken(record.userId),
        expires_in: accessTokenTtlSeconds,
        refresh_token: refreshToken,
      },
      request
    );
  } catch (error) {
    console.error("Error exchanging extension auth code:", error);
    return corsJson({ error: "server_error" }, request, { status: 500 });
  }
}

"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

/**
 * Auth.js v5 requires a CSRF token when POSTing to /api/auth/signout directly,
 * so sign-out goes through a server action instead — importable from the
 * client sidebar without shipping any auth internals to the browser.
 */
export async function signOutAction() {
  await signOut({ redirectTo: "/signin" });
}

export type SignInState = { error?: string };

/**
 * Email/password sign-in.
 *
 * A successful sign-in throws a redirect, which must be rethrown rather than
 * caught — only AuthError means the credentials were wrong. The message is the
 * same for an unknown address and a wrong password, so this cannot be used to
 * find out who has an account.
 */
export async function signInWithPassword(
  _previous: SignInState,
  formData: FormData
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  try {
    await signIn("password", {
      email,
      password,
      redirectTo: String(formData.get("callbackUrl") || "/"),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "That email and password do not match an account." };
    }
    throw error;
  }
  return {};
}

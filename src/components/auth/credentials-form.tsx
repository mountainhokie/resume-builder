"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signInWithPassword, type SignInState } from "@/app/actions/auth";

/** Email/password sign-in. Errors come back from the server action. */
export function CredentialsForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    signInWithPassword,
    {}
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <Input
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
      />
      <div>
        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          required
        />
        <div className="mt-1 text-right">
          <Link
            href="/forgot-password"
            className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
          >
            Forgot your password?
          </Link>
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

type State =
  | { status: "working" }
  | { status: "done"; email: string }
  | { status: "failed"; error: string };

export default function VerifyEmailPage() {
  const [state, setState] = useState<State>({ status: "working" });
  // React runs effects twice in development; without this the token would be
  // consumed by the first call and the second would report it invalid.
  const started = useRef(false);

  const verify = useCallback(async () => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setState({ status: "failed", error: "That link is missing its token." });
      return;
    }
    try {
      const res = await fetch("/api/account/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Could not confirm.");
      setState({ status: "done", email: payload.email });
    } catch (e) {
      setState({
        status: "failed",
        error: e instanceof Error ? e.message : "Could not confirm that link.",
      });
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    verify();
  }, [verify]);

  if (state.status === "working") {
    return (
      <AuthShell title="Confirming your email">
        <div className="flex justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      </AuthShell>
    );
  }

  if (state.status === "failed") {
    return (
      <AuthShell
        title="That link did not work"
        subtitle={state.error}
        footer={
          <Link href="/signup" className="font-medium text-blue-600 hover:underline">
            Sign up again
          </Link>
        }
      >
        <div className="flex justify-center">
          <XCircle className="h-12 w-12 text-red-500" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Email confirmed"
      subtitle={`${state.email} is ready. Sign in to get started.`}
      footer={
        <Link href="/signin" className="font-medium text-blue-600 hover:underline">
          Go to sign in
        </Link>
      }
    >
      <div className="flex justify-center">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
      </div>
    </AuthShell>
  );
}

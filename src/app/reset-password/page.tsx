"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Could not reset.");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reset that password.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthShell
        title="Password updated"
        subtitle="You can sign in with your new password now."
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

  return (
    <AuthShell
      title="Choose a new password"
      footer={
        <Link href="/signin" className="font-medium text-blue-600 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <Input
          id="password"
          type="password"
          label="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <Input
          id="confirm"
          type="password"
          label="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-gray-500">At least 10 characters.</p>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy || !token}>
          {busy ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthShell>
  );
}

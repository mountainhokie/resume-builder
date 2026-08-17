"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthShell, DevLinkNotice } from "@/components/auth/auth-shell";
import { MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDetail(null);
    try {
      const res = await fetch("/api/account/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setDetail(payload.detail ?? null);
        throw new Error(payload.error ?? "Could not send that email.");
      }
      setDevLink(payload.devLink ?? null);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send that email.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`If ${email} has an account, a reset link is on its way. It expires in an hour.`}
        footer={
          <Link href="/signin" className="font-medium text-blue-600 hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="flex justify-center">
          <MailCheck className="h-12 w-12 text-green-600" />
        </div>
        {devLink && <DevLinkNotice link={devLink} />}
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a link to choose a new one. This works even if you have only ever signed in with Google, GitHub or LinkedIn."
      footer={
        <Link href="/signin" className="font-medium text-blue-600 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <Input
          id="email"
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        {error && (
          <div role="alert">
            <p className="text-sm text-red-600">{error}</p>
            {detail && (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                {detail}
              </p>
            )}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthShell>
  );
}

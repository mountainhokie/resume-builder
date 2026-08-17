"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthShell, DevLinkNotice } from "@/components/auth/auth-shell";
import { MailCheck } from "lucide-react";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
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
      const res = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const payload = await res.json();
      if (!res.ok) {
        // Sent by the server only outside production; names the setting to fix.
        setDetail(payload.detail ?? null);
        throw new Error(payload.error ?? "Could not sign up.");
      }
      setDevLink(payload.devLink ?? null);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign up.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`If ${email} can receive mail, a confirmation link is on its way. It expires in 24 hours.`}
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
      title="Create an account"
      subtitle="Track applications, build resumes and draft cover letters."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/signin" className="font-medium text-blue-600 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <Input
          id="name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="Optional"
        />
        <Input
          id="email"
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <Input
          id="password"
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-gray-500">At least 10 characters.</p>

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
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}

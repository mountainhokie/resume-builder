"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KeyRound, Loader2 } from "lucide-react";

/**
 * Sets or changes the password on the signed-in account, so someone who
 * arrived through Google can also sign in with a password later.
 *
 * Setting a first password needs no current password — the address was already
 * proved by whichever provider signed them in. Changing an existing one does,
 * so a borrowed session cannot lock the owner out.
 */
export function PasswordCard({
  onSaved,
  onError,
}: {
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/account/password");
      if (!res.ok) return;
      const payload = await res.json();
      setHasPassword(Boolean(payload.hasPassword));
    } catch {
      // Leaves the card in its loading state rather than guessing.
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (next !== confirm) {
      onError("Those passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, password: next }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Could not save.");
      setCurrent("");
      setNext("");
      setConfirm("");
      const wasChange = hasPassword;
      setHasPassword(true);
      onSaved(wasChange ? "Password changed" : "Password set");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not save your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader className="flex items-start gap-2">
        <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {hasPassword ? "Change your password" : "Set a password"}
          </h2>
          <p className="text-sm text-gray-500">
            {hasPassword
              ? "Sign in with your email and password, or with any provider linked to this address."
              : "Add a password so you can sign in without a provider. Your existing sign-in methods keep working."}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {hasPassword === null ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : (
          <form onSubmit={submit} className="max-w-sm space-y-3">
            {hasPassword && (
              <Input
                id="current-password"
                type="password"
                label="Current password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                required
              />
            )}
            <Input
              id="new-password"
              type="password"
              label="New password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              required
            />
            <Input
              id="confirm-password"
              type="password"
              label="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
            <p className="text-xs text-gray-500">At least 10 characters.</p>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {hasPassword ? "Change password" : "Set password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

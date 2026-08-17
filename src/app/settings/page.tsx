"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { PasswordCard } from "@/components/settings/password-card";
import {
  AlertTriangle,
  Download,
  FileJson,
  Loader2,
  Upload,
} from "lucide-react";

type ImportMode = "replace" | "merge";

type ImportResult = {
  mode: ImportMode;
  imported: Record<string, number>;
  skippedInterviews: number;
};

const LABELS: Record<string, string> = {
  education: "education entries",
  employment: "employment entries",
  jobs: "jobs",
  interviews: "interviews",
  interviewQuestions: "interview questions",
  resumes: "resumes",
  coverLetters: "cover letters",
  coverLetterTemplates: "cover letter templates",
  applicationAnswers: "application answers",
  fieldMappings: "learned form fields",
};

export default function SettingsPage() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ImportMode>("replace");
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/settings/export");
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      // Take the server's filename when it offers one, so the date stamp
      // matches the export rather than the browser's clock.
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const named = /filename="([^"]+)"/.exec(disposition)?.[1];
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        named ?? `resume-builder-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Could not export your data");
    } finally {
      setExporting(false);
    }
  }

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setResult(null);
    }
    // Reset so choosing the same file twice still fires onChange.
    event.target.value = "";
  }

  async function runImport() {
    if (!pendingFile) return;
    setImporting(true);
    try {
      const text = await pendingFile.text();
      let bundle: unknown;
      try {
        bundle = JSON.parse(text);
      } catch {
        throw new Error("That file is not valid JSON.");
      }

      const res = await fetch("/api/settings/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, bundle }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Import failed.");

      setResult(payload as ImportResult);
      setPendingFile(null);
      toast.success("Import complete");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not import that file"
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 max-w-2xl text-gray-600">
          Move your data between accounts, or keep a backup of it.
        </p>
      </div>

      <PasswordCard onSaved={toast.success} onError={toast.error} />

      <Card className="mb-6">
        <CardHeader className="flex items-start gap-2">
          <Download className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Export your data
            </h2>
            <p className="text-sm text-gray-500">
              Downloads a single JSON file holding your profile, jobs,
              interviews, resumes, cover letters, application answers and the
              form fields you have taught the extension.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download export
          </Button>
          <p className="mt-3 text-sm text-gray-500">
            The file contains no passwords or sign-in tokens, so it is safe to
            keep alongside your other documents. It does contain everything you
            have written, including any demographic answers you saved.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="flex items-start gap-2">
          <Upload className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Import into this account
            </h2>
            <p className="text-sm text-gray-500">
              Sign in with the new address first, then bring your data across
              with a file exported from the old account.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            onChange={pickFile}
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            <FileJson className="mr-2 h-4 w-4" />
            Choose export file
          </Button>

          {result && (
            <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-4">
              <p className="font-medium text-green-900">
                Imported{" "}
                {result.mode === "replace"
                  ? "and replaced everything that was here."
                  : "alongside your existing data."}
              </p>
              <ul className="mt-2 space-y-0.5 text-sm text-green-800">
                {Object.entries(result.imported)
                  .filter(([, n]) => n > 0)
                  .map(([key, n]) => (
                    <li key={key}>
                      {n} {LABELS[key] ?? key}
                    </li>
                  ))}
              </ul>
              {result.skippedInterviews > 0 && (
                <p className="mt-2 text-sm text-green-800">
                  {result.skippedInterviews} interview
                  {result.skippedInterviews === 1 ? "" : "s"} skipped — the job
                  they belonged to was not in the file.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={pendingFile !== null}
        onClose={() => setPendingFile(null)}
        title="Import data"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Importing <span className="font-medium">{pendingFile?.name}</span>
          </p>

          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50">
              <input
                type="radio"
                name="mode"
                className="mt-1"
                checked={mode === "replace"}
                onChange={() => setMode("replace")}
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">
                  Replace everything
                </span>
                <span className="block text-sm text-gray-500">
                  Deletes what is currently in this account, then restores the
                  file. Use this when moving to a new address.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50">
              <input
                type="radio"
                name="mode"
                className="mt-1"
                checked={mode === "merge"}
                onChange={() => setMode("merge")}
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">
                  Add alongside
                </span>
                <span className="block text-sm text-gray-500">
                  Keeps what is here and adds the file&apos;s contents. Importing
                  the same file twice will give you two copies.
                </span>
              </span>
            </label>
          </div>

          {mode === "replace" && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">
                Everything currently in this account will be deleted first. If
                you have not exported it, do that before continuing.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingFile(null)}>
              Cancel
            </Button>
            <Button
              variant={mode === "replace" ? "danger" : "primary"}
              onClick={runImport}
              disabled={importing}
            >
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "replace" ? "Replace my data" : "Add to my data"}
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  Loader2,
  Lock,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  User,
} from "lucide-react";

type Answer = {
  id: string;
  key: string;
  label: string;
  value: string | null;
  valueType: string;
  synonyms: string[] | null;
  isSensitive: boolean;
  sortOrder: number;
};

type DerivedAnswer = { key: string; label: string; value: string };

const valueTypeOptions = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "boolean", label: "Yes / No" },
  { value: "select", label: "Choice" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
];

const booleanOptions = [
  { value: "", label: "Not set" },
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];

export default function AnswersPage() {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [derived, setDerived] = useState<DerivedAnswer[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("text");
  const toast = useToast();

  const savedRef = useRef<Record<string, string>>({});
  const dirty = answers.some(
    (a) => (values[a.id] ?? "") !== (savedRef.current[a.id] ?? "")
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/application-answers");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      const list: Answer[] = data.answers ?? [];
      setAnswers(list);
      setDerived(data.derived ?? []);
      const map = Object.fromEntries(list.map((a) => [a.id, a.value ?? ""]));
      setValues(map);
      savedRef.current = map;
    } catch {
      toast.error("Failed to load your answers");
    } finally {
      setLoading(false);
    }
    // toast.error rather than toast: useToast() returns a fresh object each
    // render, so depending on it would re-run this effect forever.
  }, [toast.error]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveAll() {
    setSaving(true);
    try {
      const updates = answers
        .filter((a) => (values[a.id] ?? "") !== (savedRef.current[a.id] ?? ""))
        .map((a) => ({ id: a.id, value: values[a.id] ?? "" }));
      const res = await fetch("/api/application-answers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error("failed");
      savedRef.current = { ...values };
      toast.success(
        updates.length === 1 ? "Answer saved" : `${updates.length} answers saved`
      );
    } catch {
      toast.error("Failed to save answers");
    } finally {
      setSaving(false);
    }
  }

  async function addAnswer() {
    const label = newLabel.trim();
    if (!label) return;
    try {
      const res = await fetch("/api/application-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, valueType: newType }),
      });
      if (!res.ok) throw new Error("failed");
      setShowAdd(false);
      setNewLabel("");
      setNewType("text");
      await load();
      toast.success("Question added");
    } catch {
      toast.error("Failed to add question");
    }
  }

  async function removeAnswer(answer: Answer) {
    if (
      !confirm(
        `Delete "${answer.label}"? Any fields you taught the extension to fill from it will also be forgotten.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/application-answers/${answer.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("failed");
      await load();
      toast.success("Question deleted");
    } catch {
      toast.error("Failed to delete question");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const standard = answers.filter((a) => !a.isSensitive);
  const sensitive = answers.filter((a) => a.isSensitive);
  const filled = answers.filter((a) => (values[a.id] ?? "").trim()).length;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Application Answers
          </h1>
          <p className="mt-1 max-w-2xl text-gray-600">
            The answers the browser extension fills into job applications. Fill
            in the ones you use — blank answers are simply skipped.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {filled} of {answers.length} answered
          </span>
          <Button onClick={saveAll} disabled={!dirty || saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex items-center gap-2">
          <User className="h-5 w-5 text-gray-400" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              From your profile
            </h2>
            <p className="text-sm text-gray-500">
              Filled automatically. Edit these on the Profile page so there is
              only one copy to keep current.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {derived.map((d) => (
              <div key={d.key} className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-gray-600">{d.label}</dt>
                <dd
                  className={
                    d.value
                      ? "truncate text-sm font-medium text-gray-900"
                      : "text-sm italic text-gray-400"
                  }
                >
                  {d.value || "not set"}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Application questions
          </h2>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add question
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {standard.map((answer) => (
            <AnswerField
              key={answer.id}
              answer={answer}
              value={values[answer.id] ?? ""}
              onChange={(v) => setValues((p) => ({ ...p, [answer.id]: v }))}
              onDelete={() => removeAnswer(answer)}
            />
          ))}
        </CardContent>
      </Card>

      {sensitive.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Voluntary demographic questions
              </h2>
              <p className="text-sm text-gray-500">
                Every platform that asks these makes them optional, and
                declining to answer is always allowed. The extension leaves
                them alone unless you turn them on for that fill.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {sensitive.map((answer) => (
              <AnswerField
                key={answer.id}
                answer={answer}
                value={values[answer.id] ?? ""}
                onChange={(v) => setValues((p) => ({ ...p, [answer.id]: v }))}
                onDelete={() => removeAnswer(answer)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add a question"
      >
        <div className="space-y-4">
          <Input
            label="Question"
            placeholder="e.g. Do you have an active security clearance?"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            autoFocus
          />
          <Select
            label="Answer type"
            options={valueTypeOptions}
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
          />
          <p className="text-sm text-gray-500">
            Word it the way applications do — the extension matches on the
            question text when it meets a field it has not seen before.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button onClick={addAnswer} disabled={!newLabel.trim()}>
              Add
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
}

function AnswerField({
  answer,
  value,
  onChange,
  onDelete,
}: {
  answer: Answer;
  value: string;
  onChange: (value: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="group">
      <div className="mb-1 flex items-start justify-between gap-3">
        <label
          htmlFor={`answer-${answer.id}`}
          className="block text-sm font-medium text-gray-700"
        >
          {answer.label}
          {answer.isSensitive && (
            <Lock className="ml-1.5 inline h-3 w-3 text-amber-500" />
          )}
        </label>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${answer.label}`}
          className="cursor-pointer text-gray-300 opacity-0 transition hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {answer.valueType === "boolean" ? (
        <Select
          id={`answer-${answer.id}`}
          options={booleanOptions}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : answer.valueType === "textarea" ? (
        <Textarea
          id={`answer-${answer.id}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer"
        />
      ) : (
        <Input
          id={`answer-${answer.id}`}
          type={answer.valueType === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer"
        />
      )}
    </div>
  );
}

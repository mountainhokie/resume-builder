"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Plus,
  Loader2,
  Trash2,
  Pencil,
  Search,
  MessageSquareText,
  X,
} from "lucide-react";
import { interviewTypeOptions } from "@/lib/constants";
import { useToast, ToastContainer } from "@/components/ui/toast";

interface QuestionEntry {
  id: string;
  question: string;
  answer: string | null;
  company: string | null;
  interviewer: string | null;
  type: string | null;
  createdAt: string;
  updatedAt: string;
}

const emptyForm = {
  question: "",
  answer: "",
  company: "",
  interviewer: "",
  type: "",
};

export default function InterviewPrepPage() {
  const [questions, setQuestions] = useState<QuestionEntry[]>([]);
  const [jobCompanies, setJobCompanies] = useState<string[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionEntry | null>(
    null
  );
  const [formData, setFormData] = useState(emptyForm);
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const toast = useToast();

  const savedFormRef = useRef(emptyForm);
  const formDirty =
    isModalOpen &&
    JSON.stringify(formData) !== JSON.stringify(savedFormRef.current);
  const dirtyRef = useRef(false);
  dirtyRef.current = formDirty;

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        e.preventDefault();
      }
    }
    function handleClick(e: MouseEvent) {
      if (!dirtyRef.current) return;
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;
      e.preventDefault();
      e.stopPropagation();
      if (confirm("You have unsaved changes. Leave without saving?")) {
        dirtyRef.current = false;
        window.location.href = href;
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("click", handleClick, true);
    };
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const profileRes = await fetch("/api/profile");
      if (!profileRes.ok) {
        setLoading(false);
        return;
      }
      const profile = await profileRes.json();
      if (!profile?.id) {
        setLoading(false);
        return;
      }
      setProfileId(profile.id);

      const [questionsRes, jobsRes] = await Promise.all([
        fetch("/api/interview-questions"),
        fetch("/api/jobs"),
      ]);

      if (questionsRes.ok) {
        const data = await questionsRes.json();
        if (Array.isArray(data)) {
          setQuestions(data);
        }
      }

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        if (Array.isArray(jobsData)) {
          const companies = jobsData
            .map((j: { company?: string }) => j.company?.trim())
            .filter(Boolean) as string[];
          setJobCompanies([...new Set(companies)].sort());
        }
      }
    } catch {
      // graceful degradation
    } finally {
      setLoading(false);
    }
  }

  function openNewQuestion() {
    setEditingQuestion(null);
    setFormData(emptyForm);
    savedFormRef.current = emptyForm;
    setIsModalOpen(true);
  }

  function openEditQuestion(q: QuestionEntry) {
    const data = {
      question: q.question,
      answer: q.answer || "",
      company: q.company || "",
      interviewer: q.interviewer || "",
      type: q.type || "",
    };
    setEditingQuestion(q);
    setFormData(data);
    savedFormRef.current = data;
    setIsModalOpen(true);
  }

  function closeModal() {
    if (formDirty) {
      if (!confirm("You have unsaved changes. Discard them?")) return;
    }
    setIsModalOpen(false);
    setEditingQuestion(null);
    setFormData(emptyForm);
  }

  async function handleSave() {
    if (!profileId || !formData.question.trim()) return;
    setSaving(true);
    try {
      if (editingQuestion) {
        const res = await fetch(
          `/api/interview-questions/${editingQuestion.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          }
        );
        if (res.ok) {
          const updated = await res.json();
          setQuestions((prev) =>
            prev.map((q) => (q.id === updated.id ? updated : q))
          );
        }
      } else {
        const res = await fetch("/api/interview-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          const created = await res.json();
          setQuestions((prev) => [created, ...prev]);
        }
      }
      setIsModalOpen(false);
      setEditingQuestion(null);
      setFormData(emptyForm);
      toast.success("Question saved successfully!");
    } catch {
      toast.error("Failed to save question. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/interview-questions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success("Question deleted successfully!");
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question. Please try again.");
    }
    setDeleteConfirm(null);
  }

  const filtered = questions.filter((q) => {
    if (typeFilter && q.type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        q.question.toLowerCase().includes(query) ||
        (q.answer && q.answer.toLowerCase().includes(query)) ||
        (q.company && q.company.toLowerCase().includes(query)) ||
        (q.interviewer && q.interviewer.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const allCompanies = useMemo(() => {
    const fromQuestions = questions
      .map((q) => q.company?.trim())
      .filter(Boolean) as string[];
    const merged = new Set([...jobCompanies, ...fromQuestions]);
    return [...merged].sort((a, b) => a.localeCompare(b));
  }, [jobCompanies, questions]);

  const typeFilterOptions = [
    { value: "", label: "All Types" },
    ...interviewTypeOptions.filter((o) => o.value !== ""),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!profileId) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent>
            <p className="text-gray-500 text-center py-8">
              Please create a profile first to use Interview Prep.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interview Prep</h1>
          <p className="text-gray-500 mt-1">
            Track questions and answers from your interviews
          </p>
        </div>
        <Button onClick={openNewQuestion}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 0%", minWidth: 0 }}>
          <Search
            className="text-gray-400"
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "16px",
              height: "16px",
            }}
          />
          <input
            type="text"
            placeholder="Search questions, answers, companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", paddingLeft: "36px", paddingRight: "32px" }}
            className="block rounded-md border border-gray-300 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                padding: "2px",
                borderRadius: "9999px",
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ width: "160px", flexShrink: 0 }}
          className="block rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm bg-white"
        >
          {typeFilterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <MessageSquareText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {questions.length === 0
                  ? "No interview questions yet. Add your first one!"
                  : "No questions match your filters."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <Card key={q.id}>
              <CardContent>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{q.question}</p>
                    {q.answer && (
                      <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                        {q.answer}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {q.type && <Badge variant="info">{q.type}</Badge>}
                      {q.company && (
                        <span className="text-xs text-gray-500">
                          {q.company}
                        </span>
                      )}
                      {q.interviewer && (
                        <span className="text-xs text-gray-400">
                          &middot; {q.interviewer}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditQuestion(q)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {deleteConfirm === q.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(q.id)}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(q.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingQuestion ? "Edit Question" : "Add Question"}
      >
        <div className="space-y-4">
          <Textarea
            label="Question *"
            id="question"
            value={formData.question}
            onChange={(e) =>
              setFormData((f) => ({ ...f, question: e.target.value }))
            }
            placeholder="What question were you asked?"
            rows={3}
          />

          <Textarea
            label="Answer"
            id="answer"
            value={formData.answer}
            onChange={(e) =>
              setFormData((f) => ({ ...f, answer: e.target.value }))
            }
            placeholder="Your answer or notes on how to answer"
            rows={5}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="w-full">
              <label
                htmlFor="company"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Company
              </label>
              <input
                id="company"
                list="company-suggestions"
                value={formData.company}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, company: e.target.value }))
                }
                placeholder="Select or type a company"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              />
              <datalist id="company-suggestions">
                {allCompanies.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <Input
              label="Interviewer"
              id="interviewer"
              value={formData.interviewer}
              onChange={(e) =>
                setFormData((f) => ({ ...f, interviewer: e.target.value }))
              }
              placeholder="Interviewer name"
            />
          </div>

          <Select
            label="Interview Type"
            id="type"
            options={interviewTypeOptions}
            value={formData.type}
            onChange={(e) =>
              setFormData((f) => ({ ...f, type: e.target.value }))
            }
          />

          {formDirty && (
            <div
              className="fixed bottom-0 left-0 right-0 z-50 bg-amber-50 border-t border-amber-200 px-6 py-3 flex items-center justify-between"
              style={{
                animation: "pulseSubtle 2s ease-in-out infinite",
              }}
            >
              <span className="text-sm font-medium text-amber-800">
                You have unsaved changes
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={closeModal}>
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !formData.question.trim()}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Save
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.question.trim()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingQuestion ? "Update" : "Add"} Question
            </Button>
          </div>
        </div>
      </Modal>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
}

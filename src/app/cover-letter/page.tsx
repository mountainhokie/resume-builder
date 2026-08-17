"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  coverLetterTemplates,
  type CoverLetterData,
} from "@/components/cover-letter/templates";
import {
  exportCoverLetterToPDF,
  exportCoverLetterToDocx,
} from "@/lib/cover-letter-export";
import type { Profile, Job } from "@/lib/schema";
import {
  Plus,
  Loader2,
  Mail,
  Download,
  Trash2,
  Eye,
  Pencil,
  X,
  Settings2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast, ToastContainer } from "@/components/ui/toast";

/** Pre-database storage key, read once to migrate an existing template. */
const LEGACY_DEFAULTS_KEY = "coverLetterDefaults";

interface SavedCoverLetter {
  id: string;
  name: string;
  template: string;
  jobId: string | null;
  recipientName: string;
  recipientTitle: string;
  companyName: string;
  companyAddress: string;
  opening: string;
  body: string;
  closing: string;
}

export default function CoverLetterPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [coverLetters, setCoverLetters] = useState<SavedCoverLetter[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor state
  const [isEditing, setIsEditing] = useState(false);
  const [editingLetter, setEditingLetter] = useState<SavedCoverLetter | null>(
    null
  );
  const [letterName, setLetterName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("standard");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientTitle, setRecipientTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [opening, setOpening] = useState("");
  const [body, setBody] = useState("");
  const [closing, setClosing] = useState("");
  const [position, setPosition] = useState("");
  const [saving, setSaving] = useState(false);

  // Default content
  const [showDefaults, setShowDefaults] = useState(false);
  const [defaultOpening, setDefaultOpening] = useState("");
  const [defaultBody, setDefaultBody] = useState("");
  const [defaultClosing, setDefaultClosing] = useState("");

  // Preview / export
  const [previewLetter, setPreviewLetter] = useState<SavedCoverLetter | null>(
    null
  );
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTarget, setExportTarget] = useState<SavedCoverLetter | null>(
    null
  );
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/profile");
      const p = await res.json();
      if (p && p.id) {
        setProfile(p);
        const [jobsRes, clRes] = await Promise.all([
          fetch("/api/jobs"),
          fetch("/api/cover-letter"),
        ]);
        setJobs(await jobsRes.json());
        setCoverLetters(await clRes.json());
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!loading && profile && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      const path = window.location.pathname;
      const match = path.match(/^\/cover-letter\/(.+)$/);
      if (match) {
        const id = match[1];
        if (id === "new") {
          startNew();
        } else {
          const letter = coverLetters.find((cl) => cl.id === id);
          if (letter) editLetter(letter);
        }
      }
    }
  }, [loading]);

  // Track saved state for defaults dirty detection
  const savedDefaultsRef = useRef({ opening: "", body: "", closing: "" });
  const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(
    null
  );
  const defaultsDirty =
    defaultOpening !== savedDefaultsRef.current.opening ||
    defaultBody !== savedDefaultsRef.current.body ||
    defaultClosing !== savedDefaultsRef.current.closing;

  // Track saved state for editor dirty detection
  const savedEditorRef = useRef({
    letterName: "", selectedTemplate: "", selectedJobId: "",
    recipientName: "", recipientTitle: "", companyName: "",
    companyAddress: "", opening: "", body: "", closing: "",
  });
  const editorDirty = isEditing && (
    letterName !== savedEditorRef.current.letterName ||
    selectedTemplate !== savedEditorRef.current.selectedTemplate ||
    selectedJobId !== savedEditorRef.current.selectedJobId ||
    recipientName !== savedEditorRef.current.recipientName ||
    recipientTitle !== savedEditorRef.current.recipientTitle ||
    companyName !== savedEditorRef.current.companyName ||
    companyAddress !== savedEditorRef.current.companyAddress ||
    opening !== savedEditorRef.current.opening ||
    body !== savedEditorRef.current.body ||
    closing !== savedEditorRef.current.closing
  );

  const dirtyRef = useRef(false);
  dirtyRef.current = defaultsDirty || editorDirty;

  // Warn on browser/tab close and client-side navigation when unsaved
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
      if (confirm("You have unsaved changes to your default template. Leave without saving?")) {
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

  const closeEditor = useRef(() => {
    setIsEditing(false);
    setEditingLetter(null);
  });

  useEffect(() => {
    function handlePopState() {
      if (!isEditing) return;
      if (editorDirty) {
        if (!confirm("You have unsaved changes. Discard them?")) {
          const editId = editingLetter?.id;
          window.history.pushState(null, "", editId ? `/cover-letter/${editId}` : "/cover-letter/new");
          return;
        }
      }
      closeEditor.current();
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [editingLetter, isEditing, editorDirty]);

  // Load the default template from the database, importing the old
  // localStorage copy once so nothing written before this change is lost.
  // The extension needs these server-side; it cannot read this origin's
  // localStorage.
  useEffect(() => {
    let cancelled = false;

    async function loadDefaults() {
      try {
        const res = await fetch("/api/cover-letter-templates");
        if (!res.ok) return;
        const templates = await res.json();
        if (cancelled) return;

        const existing = Array.isArray(templates)
          ? templates.find((t) => t.isDefault) || templates[0]
          : null;

        if (existing) {
          const vals = {
            opening: existing.opening || "",
            body: existing.body || "",
            closing: existing.closing || "",
          };
          setDefaultOpening(vals.opening);
          setDefaultBody(vals.body);
          setDefaultClosing(vals.closing);
          savedDefaultsRef.current = vals;
          setDefaultTemplateId(existing.id);
          return;
        }

        // Nothing on the server yet — migrate whatever localStorage holds.
        const stored = localStorage.getItem(LEGACY_DEFAULTS_KEY);
        if (!stored) {
          // No template at all. The extension drafts letters from this, so
          // expand the editor rather than leaving it collapsed and unfound.
          setShowDefaults(true);
          return;
        }
        const parsed = JSON.parse(stored);
        const vals = {
          opening: parsed.opening || "",
          body: parsed.body || "",
          closing: parsed.closing || "",
        };
        if (!vals.opening && !vals.body && !vals.closing) {
          setShowDefaults(true);
          return;
        }

        const created = await fetch("/api/cover-letter-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Default", ...vals, isDefault: true }),
        });
        if (!created.ok || cancelled) return;

        const saved = await created.json();
        setDefaultOpening(vals.opening);
        setDefaultBody(vals.body);
        setDefaultClosing(vals.closing);
        savedDefaultsRef.current = vals;
        setDefaultTemplateId(saved.id);
        // Keep the localStorage copy as a backup rather than deleting it.
        localStorage.setItem(`${LEGACY_DEFAULTS_KEY}.migrated`, stored);
        toast.success("Cover letter template moved to your account");
      } catch {
        // Falls back to an empty template; the editor still works.
      }
    }

    loadDefaults();
    return () => {
      cancelled = true;
    };
    // toast.success rather than toast: useToast() returns a fresh object each
    // render, so depending on it would refetch on every render.
  }, [toast.success]);

  async function saveDefaults() {
    const defaults = {
      opening: defaultOpening,
      body: defaultBody,
      closing: defaultClosing,
    };
    try {
      const res = defaultTemplateId
        ? await fetch(`/api/cover-letter-templates/${defaultTemplateId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...defaults, isDefault: true }),
          })
        : await fetch("/api/cover-letter-templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "Default",
              ...defaults,
              isDefault: true,
            }),
          });
      if (!res.ok) throw new Error("save failed");
      const saved = await res.json();
      setDefaultTemplateId(saved.id);
      savedDefaultsRef.current = defaults;
      toast.success("Default template saved successfully");
    } catch {
      toast.error("Failed to save default template");
    }
  }

  function applyPlaceholders(text: string, pos: string, company: string): string {
    let result = text;
    if (pos) result = result.replaceAll("[Position]", pos);
    if (company) result = result.replaceAll("[Company Name]", company);
    return result;
  }

  const handlePositionBlur = useCallback(() => {
    if (!position) return;
    setOpening((prev) => prev.replaceAll("[Position]", position));
    setBody((prev) => prev.replaceAll("[Position]", position));
    setClosing((prev) => prev.replaceAll("[Position]", position));
  }, [position]);

  const handleCompanyBlur = useCallback(() => {
    if (!companyName) return;
    setOpening((prev) => prev.replaceAll("[Company Name]", companyName));
    setBody((prev) => prev.replaceAll("[Company Name]", companyName));
    setClosing((prev) => prev.replaceAll("[Company Name]", companyName));
  }, [companyName]);

  function snapshotEditor(vals: {
    letterName: string; selectedTemplate: string; selectedJobId: string;
    recipientName: string; recipientTitle: string; companyName: string;
    companyAddress: string; opening: string; body: string; closing: string;
  }) {
    savedEditorRef.current = vals;
  }

  function startNew() {
    setEditingLetter(null);
    setLetterName("");
    setSelectedTemplate("standard");
    setSelectedJobId("");
    setRecipientName("");
    setRecipientTitle("");
    setCompanyName("");
    setCompanyAddress("");
    setPosition("");
    const o = defaultOpening || "";
    const b = defaultBody || "";
    const c = defaultClosing || "";
    setOpening(o);
    setBody(b);
    setClosing(c);
    snapshotEditor({
      letterName: "", selectedTemplate: "standard", selectedJobId: "",
      recipientName: "", recipientTitle: "", companyName: "",
      companyAddress: "", opening: o, body: b, closing: c,
    });
    setIsEditing(true);
    window.history.pushState(null, "", "/cover-letter/new");
  }

  function startFromJob(job: Job) {
    setEditingLetter(null);
    const name = job.company ? `Cover Letter - ${job.company} - ${job.title}` : `Cover Letter - ${job.title}`;
    const jobCompany = job.company || "";
    const o = applyPlaceholders(defaultOpening || "", job.title, jobCompany);
    const b = applyPlaceholders(defaultBody || "", job.title, jobCompany);
    const c = applyPlaceholders(defaultClosing || "", job.title, jobCompany);
    setLetterName(name);
    setSelectedTemplate("standard");
    setSelectedJobId(job.id);
    setRecipientName("");
    setRecipientTitle("");
    setCompanyName(jobCompany);
    setCompanyAddress("");
    setPosition(job.title);
    setOpening(o);
    setBody(b);
    setClosing(c);
    snapshotEditor({
      letterName: name, selectedTemplate: "standard", selectedJobId: job.id,
      recipientName: "", recipientTitle: "", companyName: jobCompany,
      companyAddress: "", opening: o, body: b, closing: c,
    });
    setIsEditing(true);
    window.history.pushState(null, "", "/cover-letter/new");
  }

  function editLetter(letter: SavedCoverLetter) {
    setEditingLetter(letter);
    setLetterName(letter.name);
    setSelectedTemplate(letter.template);
    setSelectedJobId(letter.jobId || "");
    setRecipientName(letter.recipientName || "");
    setRecipientTitle(letter.recipientTitle || "");
    setCompanyName(letter.companyName || "");
    setCompanyAddress(letter.companyAddress || "");
    setPosition(letter.jobId ? jobs.find((j) => j.id === letter.jobId)?.title || "" : "");
    setOpening(letter.opening || "");
    setBody(letter.body || "");
    setClosing(letter.closing || "");
    snapshotEditor({
      letterName: letter.name, selectedTemplate: letter.template,
      selectedJobId: letter.jobId || "",
      recipientName: letter.recipientName || "", recipientTitle: letter.recipientTitle || "",
      companyName: letter.companyName || "", companyAddress: letter.companyAddress || "",
      opening: letter.opening || "", body: letter.body || "", closing: letter.closing || "",
    });
    setIsEditing(true);
    window.history.pushState(null, "", `/cover-letter/${letter.id}`);
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const payload = {
        name: letterName || "Untitled Cover Letter",
        template: selectedTemplate,
        jobId: selectedJobId || null,
        recipientName,
        recipientTitle,
        companyName,
        companyAddress,
        opening,
        body,
        closing,
      };

      if (editingLetter) {
        const res = await fetch(`/api/cover-letter/${editingLetter.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const updated = await res.json();
        setCoverLetters(
          coverLetters.map((cl) =>
            cl.id === editingLetter.id ? updated : cl
          )
        );
      } else {
        const res = await fetch("/api/cover-letter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const created = await res.json();
        setCoverLetters([created, ...coverLetters]);
      }
      setIsEditing(false);
      window.history.replaceState(null, "", "/cover-letter");
      toast.success("Cover letter saved successfully!");
    } catch (error) {
      console.error("Error saving cover letter:", error);
      toast.error("Failed to save cover letter. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLetter(id: string) {
    if (!confirm("Delete this cover letter?")) return;
    try {
      const res = await fetch(`/api/cover-letter/${id}`, { method: "DELETE" });
      // fetch only rejects on a network failure, so without this a 404
      // or 500 would still drop the row from the list while the record
      // survived on the server.
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setCoverLetters((prev) => prev.filter((cl) => cl.id !== id));
      toast.success("Cover letter deleted successfully!");
    } catch (error) {
      console.error("Error deleting cover letter:", error);
      toast.error("Failed to delete cover letter. Please try again.");
    }
  }

  function getLetterData(letter: SavedCoverLetter): CoverLetterData {
    return {
      profile: profile!,
      recipientName: letter.recipientName || "",
      recipientTitle: letter.recipientTitle || "",
      companyName: letter.companyName || "",
      companyAddress: letter.companyAddress || "",
      opening: letter.opening || "",
      body: letter.body || "",
      closing: letter.closing || "",
    };
  }

  function getCurrentLetterData(): CoverLetterData {
    return {
      profile: profile!,
      recipientName,
      recipientTitle,
      companyName,
      companyAddress,
      opening,
      body,
      closing,
    };
  }

  async function handleExport(format: "pdf" | "docx") {
    if (!exportTarget || !profile) return;
    const data = getLetterData(exportTarget);
    const job = exportTarget.jobId ? jobs.find((j) => j.id === exportTarget.jobId) : null;
    const pos = job?.title || "";
    const company = exportTarget.companyName || job?.company || "";
    const nameParts = ["Cover Letter", `${profile.firstName} ${profile.lastName}`];
    if (pos) nameParts.push(pos);
    if (company) nameParts.push(company);
    const filename = `${nameParts.join(" - ")}.${format}`;
    if (format === "pdf") {
      exportCoverLetterToPDF(data, exportTarget.template || "standard", filename);
    } else {
      await exportCoverLetterToDocx(data, filename);
    }
    setShowExportModal(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Profile Required
        </h2>
        <p className="text-gray-500 mb-4">
          Create a profile first to build cover letters.
        </p>
        <Button onClick={() => (window.location.href = "/profile")}>
          Create Profile
        </Button>
      </div>
    );
  }

  // Editor mode
  if (isEditing) {
    const T =
      coverLetterTemplates[
        selectedTemplate as keyof typeof coverLetterTemplates
      ]?.component;

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {editingLetter ? "Edit Cover Letter" : "New Cover Letter"}
          </h1>
          <Button variant="outline" onClick={() => {
            if (editorDirty && !confirm("You have unsaved changes. Discard them?")) return;
            setIsEditing(false);
            window.history.replaceState(null, "", "/cover-letter");
          }}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-4">
          {/* Left: Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Settings</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Cover Letter Name"
                  value={letterName}
                  onChange={(e) => setLetterName(e.target.value)}
                  placeholder="My Cover Letter"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(coverLetterTemplates).map(([key, tmpl]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedTemplate(key)}
                        className={cn(
                          "px-3 py-2 rounded-md border text-sm font-medium transition-colors cursor-pointer",
                          selectedTemplate === key
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {tmpl.name}
                      </button>
                    ))}
                  </div>
                </div>
                {jobs.length > 0 && (
                  <Select
                    label="Link to Job (optional)"
                    value={selectedJobId}
                    onChange={(e) => {
                      const jobId = e.target.value;
                      setSelectedJobId(jobId);
                      if (jobId) {
                        const job = jobs.find((j) => j.id === jobId);
                        if (job) {
                          const jobPosition = job.title;
                          const jobCompany = job.company || "";
                          setPosition(jobPosition);
                          setCompanyName(jobCompany);
                          setLetterName(jobCompany ? `Cover Letter - ${jobCompany} - ${jobPosition}` : `Cover Letter - ${jobPosition}`);
                          setOpening((prev) => applyPlaceholders(prev, jobPosition, jobCompany));
                          setBody((prev) => applyPlaceholders(prev, jobPosition, jobCompany));
                          setClosing((prev) => applyPlaceholders(prev, jobPosition, jobCompany));
                        }
                      }
                    }}
                    options={[
                      { value: "", label: "No linked job" },
                      ...jobs.map((j) => ({
                        value: j.id,
                        label: j.company ? `${j.title} - ${j.company}` : j.title,
                      })),
                    ]}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold">Recipient &amp; Position</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Recipient Name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Jane Smith"
                  />
                  <Input
                    label="Recipient Title"
                    value={recipientTitle}
                    onChange={(e) => setRecipientTitle(e.target.value)}
                    placeholder="Hiring Manager"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Company Name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    onBlur={handleCompanyBlur}
                    placeholder="Acme Inc."
                  />
                  <Input
                    label="Position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    onBlur={handlePositionBlur}
                    placeholder="Software Engineer"
                  />
                </div>
                <Textarea
                  label="Company Address"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder={"123 Business Ave\nCity, State 12345"}
                  className="min-h-[60px]"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold">Letter Content</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  label="Opening Paragraph"
                  value={opening}
                  onChange={(e) => setOpening(e.target.value)}
                  placeholder="Your introduction and why you're writing..."
                  className="min-h-[100px]"
                />
                <Textarea
                  label="Body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Highlight your relevant experience, skills, and why you're a good fit..."
                  className="min-h-[150px]"
                />
                <Textarea
                  label="Closing Paragraph"
                  value={closing}
                  onChange={(e) => setClosing(e.target.value)}
                  placeholder="Thank them and express interest in next steps..."
                  className="min-h-[80px]"
                />
              </CardContent>
            </Card>

          </div>

          {/* Right: Preview */}
          <div className="sticky top-8">
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Preview</h2>
              </CardHeader>
              <CardContent className="p-0 overflow-auto max-h-[80vh]">
                {T && (
                  <div className="transform scale-[0.85] origin-top-left w-[118%]">
                    <T data={getCurrentLetterData()} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sticky save bar */}
        <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 py-4 px-6 -mx-4 sm:-mx-6 lg:-mx-8 mt-6">
          <div className="max-w-7xl mx-auto flex items-center justify-end gap-3">
            {editorDirty && (
              <span className="text-sm text-amber-600 font-medium">Unsaved changes</span>
            )}
            <div
              className="inline-block rounded-md"
              style={editorDirty ? {
                animation: "pulseSubtle 2s ease-in-out infinite",
              } : undefined}
            >
              <Button
                onClick={handleSave}
                disabled={saving}
                size="lg"
              >
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Save Cover Letter
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List mode
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cover Letters</h1>
          <p className="text-gray-600 mt-1">
            Create tailored cover letters for each application.
          </p>
        </div>
        <Button onClick={startNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Cover Letter
        </Button>
      </div>

      {/* Quick create from jobs */}
      {jobs.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">
              Quick Create from Job
            </h2>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {jobs.slice(0, 5).map((job) => (
                <Button
                  key={job.id}
                  variant="outline"
                  size="sm"
                  onClick={() => startFromJob(job)}
                >
                  <Mail className="h-3 w-3 mr-1" />
                  {job.company ? `${job.title} - ${job.company}` : job.title}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Default Content Template */}
      <Card className="mb-6">
        <CardHeader>
          <button
            onClick={() => setShowDefaults(!showDefaults)}
            className="flex items-center justify-between w-full cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700">
                Default Content Template
              </h2>
            </div>
            {showDefaults ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </CardHeader>
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: showDefaults ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <CardContent className="space-y-4">
              <p className="text-xs text-gray-500">
                Set default content for new cover letters. Use <code className="bg-gray-100 px-1 rounded">[Position]</code> and{" "}
                <code className="bg-gray-100 px-1 rounded">[Company Name]</code> as placeholders — they will be automatically replaced when you fill in those fields.
              </p>
              <Textarea
                label="Default Opening Paragraph"
                value={defaultOpening}
                onChange={(e) => setDefaultOpening(e.target.value)}
                placeholder="I am writing to express my interest in the [Position] role at [Company Name]..."
                className="min-h-[80px]"
              />
              <Textarea
                label="Default Body"
                value={defaultBody}
                onChange={(e) => setDefaultBody(e.target.value)}
                placeholder="Throughout my career, I have developed expertise in..."
                className="min-h-[120px]"
              />
              <Textarea
                label="Default Closing Paragraph"
                value={defaultClosing}
                onChange={(e) => setDefaultClosing(e.target.value)}
                placeholder="Thank you for considering my application..."
                className="min-h-[80px]"
              />
              <div className="pt-2">
                <div
                  className="inline-block rounded-md"
                  style={defaultsDirty ? {
                    animation: "pulseSubtle 2s ease-in-out infinite",
                  } : undefined}
                >
                  <Button onClick={saveDefaults}>
                    Save Defaults
                  </Button>
                </div>
              </div>
            </CardContent>
          </div>
        </div>
      </Card>

      {coverLetters.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            No cover letters yet. Create your first one!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coverLetters.map((letter) => (
            <Card
              key={letter.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {letter.name}
                  </h3>
                  <Badge variant="info">
                    {coverLetterTemplates[
                      letter.template as keyof typeof coverLetterTemplates
                    ]?.name || letter.template}
                  </Badge>
                </div>
                {letter.companyName && (
                  <p className="text-xs text-gray-500 mb-1">
                    To: {letter.companyName}
                  </p>
                )}
                {letter.opening && (
                  <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                    {letter.opening}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editLetter(letter)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewLetter(letter)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setExportTarget(letter);
                      setShowExportModal(true);
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteLetter(letter.id)}
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewLetter && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewLetter(null)}
          title={`Preview: ${previewLetter.name}`}
          size="xl"
        >
          <div className="overflow-auto max-h-[70vh]">
            {(() => {
              const T =
                coverLetterTemplates[
                  previewLetter.template as keyof typeof coverLetterTemplates
                ]?.component;
              return T ? <T data={getLetterData(previewLetter)} /> : null;
            })()}
          </div>
        </Modal>
      )}



      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Cover Letter"
        size="sm"
      >
        {exportTarget && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Choose an export format for &quot;{exportTarget.name}&quot;
            </p>
            <div className="flex gap-3">
              <Button onClick={() => handleExport("pdf")} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                onClick={() => handleExport("docx")}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                DOCX
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
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
  ExternalLink,
  Briefcase,
  ArrowUpDown,
  Search,
  CalendarDays,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { interviewTypeOptions } from "@/lib/constants";
import { useToast, ToastContainer } from "@/components/ui/toast";

interface Job {
  id: string;
  title: string;
  company: string;
  url: string;
  description: string;
  benefits: string;
  status: string;
  notes: string;
  createdAt: string;
}

interface InterviewEntry {
  id?: string;
  date: string;
  interviewer: string;
  type: string;
  notes: string;
}

const statusOptions = [
  { value: "Applied", label: "Applied" },
  { value: "Interviewing", label: "Interviewing" },
  { value: "Rejected", label: "Rejected" },
  { value: "Following Up", label: "Following Up" },
  { value: "Ghosted", label: "Ghosted" },
];

const statusColors: Record<string, "info" | "success" | "danger" | "warning" | "default"> = {
  Applied: "info",
  Interviewing: "success",
  Rejected: "danger",
  "Following Up": "warning",
  Ghosted: "default",
};

const emptyJob = {
  title: "",
  company: "",
  url: "",
  description: "",
  benefits: "",
  status: "Applied",
  notes: "",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState(emptyJob);
  const [filter, setFilter] = useState("Applied");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [companySearch, setCompanySearch] = useState("");

  const [interviews, setInterviews] = useState<InterviewEntry[]>([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);
  const [deletedInterviewIds, setDeletedInterviewIds] = useState<string[]>([]);
  const [interviewCounts, setInterviewCounts] = useState<Record<string, number>>({});

  const savedFormRef = useRef(emptyJob);
  const savedInterviewsRef = useRef<InterviewEntry[]>([]);
  const formDirty =
    isModalOpen &&
    (JSON.stringify(formData) !== JSON.stringify(savedFormRef.current) ||
      JSON.stringify(interviews) !== JSON.stringify(savedInterviewsRef.current) ||
      deletedInterviewIds.length > 0);
  const dirtyRef = useRef(false);
  dirtyRef.current = formDirty;

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) { e.preventDefault(); }
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
      const profile = await profileRes.json();
      if (profile && profile.id) {
        setProfileId(profile.id);
        const [jobsRes, countsRes] = await Promise.all([
          fetch("/api/jobs"),
          fetch("/api/interviews/counts").catch(() => null),
        ]);
        const jobsData = await jobsRes.json();
        setJobs(jobsData);
        if (countsRes && countsRes.ok) {
          const counts = await countsRes.json();
          setInterviewCounts(counts);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  const closeModal = useRef(() => {
    setIsModalOpen(false);
    setEditingJob(null);
  });

  useEffect(() => {
    function handlePopState() {
      if (dirtyRef.current) {
        if (!confirm("You have unsaved changes. Discard them?")) {
          const editId = editingJob?.id;
          window.history.pushState(null, "", editId ? `/jobs/${editId}` : "/jobs/new");
          return;
        }
      }
      closeModal.current();
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [editingJob]);

  useEffect(() => {
    if (!loading && jobs.length > 0) {
      const path = window.location.pathname;
      const match = path.match(/^\/jobs\/(.+)$/);
      if (match) {
        const id = match[1];
        if (id === "new") {
          openNewJob();
        } else {
          const job = jobs.find((j) => j.id === id);
          if (job) openEditJob(job);
        }
      }
    }
  }, [loading]);

  function openNewJob() {
    setEditingJob(null);
    setFormData(emptyJob);
    setInterviews([]);
    setDeletedInterviewIds([]);
    savedFormRef.current = { ...emptyJob };
    savedInterviewsRef.current = [];
    setIsModalOpen(true);
    window.history.pushState(null, "", "/jobs/new");
  }

  async function openEditJob(job: Job) {
    setEditingJob(job);
    const snapshot = {
      title: job.title,
      company: job.company || "",
      url: job.url || "",
      description: job.description || "",
      benefits: job.benefits || "",
      status: job.status,
      notes: job.notes || "",
    };
    setFormData(snapshot);
    savedFormRef.current = snapshot;
    setInterviews([]);
    setDeletedInterviewIds([]);
    savedInterviewsRef.current = [];
    setIsModalOpen(true);
    window.history.pushState(null, "", `/jobs/${job.id}`);

    setInterviewsLoading(true);
    try {
      const res = await fetch(`/api/interviews?jobId=${job.id}`);
      if (res.ok) {
        const data = await res.json();
        const mapped: InterviewEntry[] = (Array.isArray(data) ? data : []).map(
          (i: { id: string; date: string; interviewer: string | null; type: string | null; notes: string | null }) => ({
            id: i.id,
            date: i.date,
            interviewer: i.interviewer || "",
            type: i.type || "",
            notes: i.notes || "",
          })
        );
        setInterviews(mapped);
        savedInterviewsRef.current = mapped;
      }
    } catch {
      // interviews table may not exist yet
    } finally {
      setInterviewsLoading(false);
    }
  }

  function addInterview() {
    setInterviews([...interviews, { date: "", interviewer: "", type: "", notes: "" }]);
  }

  function removeInterview(index: number) {
    const interview = interviews[index];
    if (interview.id) {
      setDeletedInterviewIds([...deletedInterviewIds, interview.id]);
    }
    setInterviews(interviews.filter((_, i) => i !== index));
  }

  function updateInterview(index: number, field: keyof InterviewEntry, value: string) {
    setInterviews(
      interviews.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function handleSave() {
    if (!profileId) return;
    setSaving(true);
    try {
      let jobId: string;
      if (editingJob) {
        const res = await fetch(`/api/jobs/${editingJob.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const updated = await res.json();
        setJobs(jobs.map((j) => (j.id === editingJob.id ? updated : j)));
        jobId = editingJob.id;
      } else {
        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const created = await res.json();
        setJobs([created, ...jobs]);
        jobId = created.id;
      }

      for (const interview of interviews) {
        if (!interview.date) continue;
        const payload = {
          date: interview.date,
          interviewer: interview.interviewer || null,
          type: interview.type || null,
          notes: interview.notes || null,
          jobId,
        };
        if (interview.id) {
          await fetch(`/api/interviews/${interview.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          await fetch("/api/interviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
      }

      for (const id of deletedInterviewIds) {
        await fetch(`/api/interviews/${id}`, { method: "DELETE" });
      }

      setInterviewCounts((prev) => {
        const count = interviews.filter((i) => i.date).length;
        const next = { ...prev };
        if (count > 0) {
          next[jobId] = count;
        } else {
          delete next[jobId];
        }
        return next;
      });

      setIsModalOpen(false);
      window.history.replaceState(null, "", "/jobs");
      toast.success("Job saved successfully!");
    } catch (error) {
      console.error("Error saving job:", error);
      toast.error("Failed to save job. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this job?")) return;
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      // fetch only rejects on a network failure, so without this a 404
      // or 500 would still drop the row from the list while the record
      // survived on the server.
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      toast.success("Job deleted successfully!");
      setInterviewCounts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (error) {
      console.error("Error deleting job:", error);
      toast.error("Failed to delete job. Please try again.");
    }
  }

  const showInterviewsSection =
    formData.status === "Interviewing" || interviews.length > 0;

  const filteredJobs = (
    filter === "All" ? jobs : jobs.filter((j) => j.status === filter)
  )
    .filter((j) =>
      companySearch
        ? (j.company || "").toLowerCase().includes(companySearch.toLowerCase())
        : true
    )
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!profileId) {
    return (
      <div className="text-center py-16">
        <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Profile Required
        </h2>
        <p className="text-gray-500 mb-4">
          Please create a profile first before tracking jobs.
        </p>
        <Button onClick={() => (window.location.href = "/profile")}>
          Create Profile
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Tracker</h1>
          <p className="text-gray-600 mt-1">
            Track your job applications and their status.
          </p>
        </div>
        <Button onClick={openNewJob}>
          <Plus className="h-4 w-4 mr-2" />
          Add Job
        </Button>
      </div>

      {/* Filters & Sort */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {["All", ...statusOptions.map((s) => s.value)].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer",
                filter === status
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {status}
              {status !== "All" && (
                <span className="ml-1">
                  ({jobs.filter((j) => j.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() =>
            setSortOrder(sortOrder === "newest" ? "oldest" : "newest")
          }
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer shrink-0"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortOrder === "newest" ? "Newest First" : "Oldest First"}
        </button>
      </div>

      {/* Company Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={companySearch}
          onChange={(e) => setCompanySearch(e.target.value)}
          placeholder="Search by company name..."
          className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {companySearch && (
          <button
            onClick={() => setCompanySearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 transition-colors cursor-pointer text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Jobs list */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No jobs found. Add your first job application!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {job.title}
                      </h3>
                      <Badge variant={statusColors[job.status] || "default"}>
                        {job.status}
                      </Badge>
                      {interviewCounts[job.id] > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-medium">
                          <CalendarDays className="h-3 w-3" />
                          {interviewCounts[job.id]} interview{interviewCounts[job.id] > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {job.company && (
                      <p className="text-sm text-gray-600">{job.company}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      Applied {new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        View Listing
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {job.description && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                        {job.description}
                      </p>
                    )}
                    {job.notes && (
                      <p className="text-xs text-gray-400 mt-1 italic">
                        Note: {job.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditJob(job)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(job.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (formDirty && !confirm("You have unsaved changes. Discard them?")) return;
          setIsModalOpen(false);
          window.history.replaceState(null, "", "/jobs");
        }}
        title={editingJob ? "Edit Job" : "Add Job"}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Job Title"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="Software Engineer"
            required
          />
          <Input
            label="Company"
            value={formData.company}
            onChange={(e) =>
              setFormData({ ...formData, company: e.target.value })
            }
            placeholder="Acme Inc."
          />
          <Input
            label="Job URL"
            value={formData.url}
            onChange={(e) =>
              setFormData({ ...formData, url: e.target.value })
            }
            placeholder="https://company.com/jobs/123"
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Paste the job description here..."
            className="min-h-[120px]"
          />
          <Textarea
            label="Benefits"
            value={formData.benefits}
            onChange={(e) =>
              setFormData({ ...formData, benefits: e.target.value })
            }
            placeholder="Health insurance, 401k, remote work..."
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
            options={statusOptions}
          />
          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            placeholder="Any personal notes about this application..."
          />

          {/* Interviews Section */}
          {showInterviewsSection && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-semibold text-gray-700">
                    Interviews ({interviews.length})
                  </h3>
                </div>
                <Button variant="outline" size="sm" onClick={addInterview}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Interview
                </Button>
              </div>

              {interviewsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                </div>
              ) : interviews.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">
                  No interviews added yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {interviews.map((interview, index) => (
                    <div
                      key={interview.id || `new-${index}`}
                      className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50/50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                          Round {index + 1}
                        </span>
                        <button
                          onClick={() => removeInterview(index)}
                          className="text-red-400 hover:text-red-600 transition-colors cursor-pointer p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Date"
                          type="date"
                          value={interview.date}
                          onChange={(e) =>
                            updateInterview(index, "date", e.target.value)
                          }
                          required
                        />
                        <Select
                          label="Type"
                          value={interview.type}
                          onChange={(e) =>
                            updateInterview(index, "type", e.target.value)
                          }
                          options={interviewTypeOptions}
                        />
                      </div>
                      <Input
                        label="Interviewer"
                        value={interview.interviewer}
                        onChange={(e) =>
                          updateInterview(index, "interviewer", e.target.value)
                        }
                        placeholder="Jane Smith, Hiring Manager"
                      />
                      <Textarea
                        label="Notes"
                        value={interview.notes}
                        onChange={(e) =>
                          updateInterview(index, "notes", e.target.value)
                        }
                        placeholder="Topics discussed, feedback, follow-up items..."
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={() => {
              if (formDirty && !confirm("You have unsaved changes. Discard them?")) return;
              setIsModalOpen(false);
            }}>
              Cancel
            </Button>
            <div className="flex items-center gap-3">
              {formDirty && (
                <span className="text-sm text-amber-600 font-medium">Unsaved changes</span>
              )}
              <div
                className="inline-block rounded-md"
                style={formDirty ? { animation: "pulseSubtle 2s ease-in-out infinite" } : undefined}
              >
                <Button onClick={handleSave} disabled={saving || !formData.title}>
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {editingJob ? "Update" : "Add"} Job
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
}

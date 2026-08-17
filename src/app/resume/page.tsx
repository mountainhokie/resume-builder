"use client";

import { useState, useEffect, useRef, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  templates,
  type ResumeData,
} from "@/components/resume/templates";
import { exportToPDF, exportToDocx } from "@/lib/export-utils";
import { Select } from "@/components/ui/select";
import { useToast, ToastContainer } from "@/components/ui/toast";
import type { Profile, Education, Employment, Job } from "@/lib/schema";
import {
  Plus,
  Loader2,
  FileText,
  Download,
  Trash2,
  Eye,
  X,
  GripVertical,
  Pencil,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SavedResume {
  id: string;
  name: string;
  template: string;
  jobId: string | null;
  selectedEducation: string[];
  selectedEmployment: string[];
  selectedSkills: string[];
  selectedDuties: string[];
  customPositionTitle: string;
  customPositionTitles: Record<string, string>;
  customSummary: string;
  customSections: { title: string; content: string }[];
}

export default function ResumePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [educationList, setEducationList] = useState<Education[]>([]);
  const [employmentList, setEmploymentList] = useState<Employment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Builder state
  const [isBuilding, setIsBuilding] = useState(false);
  const [editingResume, setEditingResume] = useState<SavedResume | null>(null);
  const [resumeName, setResumeName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedEdu, setSelectedEdu] = useState<string[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedDuties, setSelectedDuties] = useState<string[]>([]);
  const [customPositionTitle, setCustomPositionTitle] = useState("");
  const [editingPositionTitle, setEditingPositionTitle] = useState(false);
  const [customPositionTitles, setCustomPositionTitles] = useState<Record<string, string>>({});
  const [editingEmpTitle, setEditingEmpTitle] = useState<string | null>(null);
  const [customSummary, setCustomSummary] = useState("");
  const [customSections, setCustomSections] = useState<
    { title: string; content: string }[]
  >([]);
  const [saving, setSaving] = useState(false);

  // Preview state
  const [previewResume, setPreviewResume] = useState<SavedResume | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTarget, setExportTarget] = useState<SavedResume | null>(null);

  // Drag-and-drop state for duties
  const dutyDragRef = useRef<{ empId: string; index: number } | null>(null);
  const [dutyDragOver, setDutyDragOver] = useState<{ empId: string; index: number } | null>(null);

  // Drag-and-drop state for skills
  const skillDragRef = useRef<number | null>(null);
  const [skillDragOver, setSkillDragOver] = useState<number | null>(null);

  // Dirty tracking
  const savedResumeRef = useRef({
    resumeName: "", selectedTemplate: "classic", selectedJobId: "",
    selectedEdu: [] as string[], selectedEmp: [] as string[],
    selectedSkills: [] as string[], selectedDuties: [] as string[],
    customPositionTitle: "",
    customPositionTitles: {} as Record<string, string>,
    customSummary: "", customSections: [] as { title: string; content: string }[],
  });
  const resumeDirty = isBuilding && (
    resumeName !== savedResumeRef.current.resumeName ||
    selectedTemplate !== savedResumeRef.current.selectedTemplate ||
    selectedJobId !== savedResumeRef.current.selectedJobId ||
    JSON.stringify(selectedEdu) !== JSON.stringify(savedResumeRef.current.selectedEdu) ||
    JSON.stringify(selectedEmp) !== JSON.stringify(savedResumeRef.current.selectedEmp) ||
    JSON.stringify(selectedSkills) !== JSON.stringify(savedResumeRef.current.selectedSkills) ||
    JSON.stringify(selectedDuties) !== JSON.stringify(savedResumeRef.current.selectedDuties) ||
    customPositionTitle !== savedResumeRef.current.customPositionTitle ||
    JSON.stringify(customPositionTitles) !== JSON.stringify(savedResumeRef.current.customPositionTitles) ||
    customSummary !== savedResumeRef.current.customSummary ||
    JSON.stringify(customSections) !== JSON.stringify(savedResumeRef.current.customSections)
  );
  const dirtyRef = useRef(false);
  dirtyRef.current = resumeDirty;

  function handleDutyDragStart(empId: string, index: number) {
    dutyDragRef.current = { empId, index };
  }

  function handleDutyDragOver(e: DragEvent, empId: string, index: number) {
    e.preventDefault();
    if (dutyDragRef.current?.empId === empId) {
      setDutyDragOver({ empId, index });
    }
  }

  function handleDutyDrop(e: DragEvent, empId: string, dropIndex: number) {
    e.preventDefault();
    const drag = dutyDragRef.current;
    if (!drag || drag.empId !== empId || drag.index === dropIndex) {
      dutyDragRef.current = null;
      setDutyDragOver(null);
      return;
    }
    const emp = employmentList.find((em) => em.id === empId);
    if (!emp || !Array.isArray(emp.duties)) return;
    const duties = emp.duties as { id: string; text: string }[];
    const thisEmpIds = new Set(duties.map((d) => d.id));
    const selectedForEmp = selectedDuties.filter((id) => thisEmpIds.has(id));
    const reordered = [...selectedForEmp];
    const [moved] = reordered.splice(drag.index, 1);
    reordered.splice(dropIndex, 0, moved);
    const reorderedSet = new Set(reordered);
    const otherIds = selectedDuties.filter((id) => !reorderedSet.has(id));
    setSelectedDuties([...otherIds, ...reordered]);
    dutyDragRef.current = null;
    setDutyDragOver(null);
  }

  function handleDutyDragEnd() {
    dutyDragRef.current = null;
    setDutyDragOver(null);
  }

  function handleSkillDragStart(index: number) {
    skillDragRef.current = index;
  }

  function handleSkillDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    setSkillDragOver(index);
  }

  function handleSkillDrop(e: DragEvent, dropIndex: number) {
    e.preventDefault();
    const dragIndex = skillDragRef.current;
    if (dragIndex === null || dragIndex === dropIndex) {
      skillDragRef.current = null;
      setSkillDragOver(null);
      return;
    }
    const reordered = [...selectedSkills];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setSelectedSkills(reordered);
    skillDragRef.current = null;
    setSkillDragOver(null);
  }

  function handleSkillDragEnd() {
    skillDragRef.current = null;
    setSkillDragOver(null);
  }

  const closeBuilder = useRef(() => {
    setIsBuilding(false);
    setEditingResume(null);
  });

  useEffect(() => {
    function handlePopState() {
      if (dirtyRef.current) {
        if (!confirm("You have unsaved changes. Discard them?")) {
          const editId = editingResume?.id;
          window.history.pushState(null, "", editId ? `/resume/${editId}` : "/resume/new");
          return;
        }
      }
      closeBuilder.current();
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [editingResume]);

  useEffect(() => {
    loadData();
  }, []);

  // Navigation guard for unsaved changes
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        e.preventDefault();
      }
    }
    function onClickCapture(e: MouseEvent) {
      if (!dirtyRef.current) return;
      const anchor = (e.target as HTMLElement).closest("a");
      if (anchor && anchor.href && anchor.origin === window.location.origin) {
        if (!confirm("You have unsaved changes. Discard them?")) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/profile");
      const p = await res.json();
      if (p && p.id) {
        setProfile(p);
        const [eduRes, empRes, jobsRes, resumeRes] = await Promise.all([
          fetch("/api/education"),
          fetch("/api/employment"),
          fetch("/api/jobs"),
          fetch("/api/resume"),
        ]);
        setEducationList(await eduRes.json());
        setEmploymentList(await empRes.json());
        setJobs(await jobsRes.json());
        setSavedResumes(await resumeRes.json());
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
      const match = path.match(/^\/resume\/(.+)$/);
      if (match) {
        const id = match[1];
        if (id === "new") {
          startNewResume();
        } else {
          const resume = savedResumes.find((r) => r.id === id);
          if (resume) editResume(resume);
        }
      }
    }
  }, [loading]);

  function startNewResume() {
    setEditingResume(null);
    setResumeName("");
    setSelectedTemplate("classic");
    setSelectedJobId("");
    setSelectedEdu(educationList.map((e) => e.id));
    setSelectedEmp(employmentList.map((e) => e.id));
    setSelectedSkills(profile?.skills || []);
    setSelectedDuties(
      employmentList.flatMap((emp) =>
        Array.isArray(emp.duties) ? emp.duties.map((d: { id: string }) => d.id) : []
      )
    );
    setCustomPositionTitle("");
    setEditingPositionTitle(false);
    setCustomPositionTitles({});
    setEditingEmpTitle(null);
    setCustomSummary("");
    setCustomSections([]);
    savedResumeRef.current = {
      resumeName: "",
      selectedTemplate: "classic",
      selectedJobId: "",
      selectedEdu: educationList.map((e) => e.id),
      selectedEmp: employmentList.map((e) => e.id),
      selectedSkills: profile?.skills || [],
      selectedDuties: employmentList.flatMap((emp) =>
        Array.isArray(emp.duties) ? emp.duties.map((d: { id: string }) => d.id) : []
      ),
      customPositionTitle: "",
      customPositionTitles: {},
      customSummary: "",
      customSections: [],
    };
    setIsBuilding(true);
    window.history.pushState(null, "", "/resume/new");
  }

  function editResume(resume: SavedResume) {
    setEditingResume(resume);
    setResumeName(resume.name);
    setSelectedTemplate(resume.template);
    setSelectedJobId(resume.jobId || "");
    setSelectedEdu(resume.selectedEducation || []);
    setSelectedEmp(resume.selectedEmployment || []);
    setSelectedSkills(resume.selectedSkills || []);
    setSelectedDuties(resume.selectedDuties || []);
    setCustomPositionTitle(resume.customPositionTitle || "");
    setEditingPositionTitle(false);
    setCustomPositionTitles(resume.customPositionTitles || {});
    setEditingEmpTitle(null);
    setCustomSummary(resume.customSummary || "");
    setCustomSections(resume.customSections || []);
    savedResumeRef.current = {
      resumeName: resume.name,
      selectedTemplate: resume.template,
      selectedJobId: resume.jobId || "",
      selectedEdu: resume.selectedEducation || [],
      selectedEmp: resume.selectedEmployment || [],
      selectedSkills: resume.selectedSkills || [],
      selectedDuties: resume.selectedDuties || [],
      customPositionTitle: resume.customPositionTitle || "",
      customPositionTitles: resume.customPositionTitles || {},
      customSummary: resume.customSummary || "",
      customSections: resume.customSections || [],
    };
    setIsBuilding(true);
    window.history.pushState(null, "", `/resume/${resume.id}`);
  }

  async function handleSaveResume() {
    if (!profile) return;
    setSaving(true);
    try {
      const payload = {
        name: resumeName || "Untitled Resume",
        template: selectedTemplate,
        jobId: selectedJobId || null,
        selectedEducation: selectedEdu,
        selectedEmployment: selectedEmp,
        selectedSkills: selectedSkills,
        selectedDuties: selectedDuties,
        customPositionTitle: customPositionTitle || null,
        customPositionTitles: Object.keys(customPositionTitles).length > 0 ? customPositionTitles : {},
        customSummary: customSummary,
        customSections: customSections,
      };

      if (editingResume) {
        const res = await fetch(`/api/resume/${editingResume.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const updated = await res.json();
        setSavedResumes(
          savedResumes.map((r) => (r.id === editingResume.id ? updated : r))
        );
      } else {
        const res = await fetch("/api/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const created = await res.json();
        setSavedResumes([created, ...savedResumes]);
      }
      savedResumeRef.current = {
        resumeName: resumeName || "Untitled Resume",
        selectedTemplate,
        selectedJobId,
        selectedEdu: [...selectedEdu],
        selectedEmp: [...selectedEmp],
        selectedSkills: [...selectedSkills],
        selectedDuties: [...selectedDuties],
        customPositionTitle,
        customPositionTitles: { ...customPositionTitles },
        customSummary,
        customSections: customSections.map((s) => ({ ...s })),
      };
      setIsBuilding(false);
      window.history.replaceState(null, "", "/resume");
      toast.success("Resume saved successfully!");
    } catch (error) {
      console.error("Error saving resume:", error);
      toast.error("Failed to save resume. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteResume(id: string) {
    if (!confirm("Delete this resume?")) return;
    try {
      const res = await fetch(`/api/resume/${id}`, { method: "DELETE" });
      // fetch only rejects on a network failure, so without this a 404
      // or 500 would still drop the row from the list while the record
      // survived on the server.
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setSavedResumes((prev) => prev.filter((r) => r.id !== id));
      toast.success("Resume deleted successfully!");
    } catch (error) {
      console.error("Error deleting resume:", error);
      toast.error("Failed to delete resume. Please try again.");
    }
  }

  function getResumeData(resume: SavedResume): ResumeData {
    const p = resume.customPositionTitle
      ? { ...profile!, positionTitle: resume.customPositionTitle }
      : profile!;
    return {
      profile: p,
      education: educationList,
      employment: employmentList,
      selectedEducation: resume.selectedEducation || [],
      selectedEmployment: resume.selectedEmployment || [],
      selectedSkills: resume.selectedSkills || [],
      selectedDuties: resume.selectedDuties || [],
      customSummary: resume.customSummary || "",
      customSections: resume.customSections || [],
      customPositionTitles: resume.customPositionTitles || {},
    };
  }

  function getCurrentResumeData(): ResumeData {
    const p = customPositionTitle
      ? { ...profile!, positionTitle: customPositionTitle }
      : profile!;
    return {
      profile: p,
      education: educationList,
      employment: employmentList,
      selectedEducation: selectedEdu,
      selectedEmployment: selectedEmp,
      selectedSkills: selectedSkills,
      selectedDuties: selectedDuties,
      customSummary: customSummary,
      customSections: customSections,
      customPositionTitles,
    };
  }

  async function handleExport(format: "pdf" | "docx") {
    if (!exportTarget || !profile) return;
    const data = getResumeData(exportTarget);
    const job = exportTarget.jobId ? jobs.find((j) => j.id === exportTarget.jobId) : null;
    const pos = job?.title || "";
    const company = job?.company || "";
    const nameParts = ["Resume", `${profile.firstName} ${profile.lastName}`];
    if (pos) nameParts.push(pos);
    if (company) nameParts.push(company);
    const filename = `${nameParts.join(" - ")}.${format}`;

    if (format === "pdf") {
      exportToPDF(data, exportTarget.template || "classic", filename);
    } else {
      await exportToDocx(data, filename);
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
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Profile Required
        </h2>
        <p className="text-gray-500 mb-4">
          Create a profile first to build resumes.
        </p>
        <Button onClick={() => (window.location.href = "/profile")}>
          Create Profile
        </Button>
      </div>
    );
  }

  // Resume builder mode
  if (isBuilding) {
    const TemplateComponent =
      templates[selectedTemplate as keyof typeof templates]?.component;

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {editingResume ? "Edit Resume" : "New Resume"}
          </h1>
          <Button variant="outline" onClick={() => {
            if (resumeDirty && !confirm("You have unsaved changes. Discard them?")) return;
            setIsBuilding(false);
            window.history.replaceState(null, "", "/resume");
          }}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-4">
          {/* Left: Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Resume Settings</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Resume Name"
                  value={resumeName}
                  onChange={(e) => setResumeName(e.target.value)}
                  placeholder="My Resume"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(templates).map(([key, tmpl]) => (
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
                    onChange={(e) => setSelectedJobId(e.target.value)}
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
                <h2 className="font-semibold">Select Content</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Education selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Education
                  </label>
                  {educationList.map((edu) => (
                    <label
                      key={edu.id}
                      className="flex items-center gap-2 mb-1 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEdu.includes(edu.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEdu([...selectedEdu, edu.id]);
                          } else {
                            setSelectedEdu(
                              selectedEdu.filter((id) => id !== edu.id)
                            );
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">
                        {edu.institution} - {edu.diplomaType}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Employment selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employment
                  </label>
                  {employmentList.map((emp) => {
                    const duties = Array.isArray(emp.duties) ? emp.duties as { id: string; text: string }[] : [];
                    const empSelected = selectedEmp.includes(emp.id);
                    return (
                      <div key={emp.id} className="mb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={empSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmp([...selectedEmp, emp.id]);
                                const dutyIds = duties.map((d) => d.id);
                                setSelectedDuties((prev) => [...new Set([...prev, ...dutyIds])]);
                              } else {
                                setSelectedEmp(selectedEmp.filter((id) => id !== emp.id));
                                const dutyIds = new Set(duties.map((d) => d.id));
                                setSelectedDuties((prev) => prev.filter((id) => !dutyIds.has(id)));
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm font-medium">
                            {customPositionTitles[emp.id] || emp.positionTitle} at {emp.companyName}
                          </span>
                        </label>
                        {empSelected && (
                          editingEmpTitle === emp.id ? (
                            <div className="ml-6 mt-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={customPositionTitles[emp.id] ?? emp.positionTitle ?? ""}
                                onChange={(e) =>
                                  setCustomPositionTitles((prev) => ({ ...prev, [emp.id]: e.target.value }))
                                }
                                placeholder={emp.positionTitle || "Position title"}
                                className="block w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") setEditingEmpTitle(null);
                                }}
                              />
                              <button
                                onClick={() => setEditingEmpTitle(null)}
                                className="p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer text-green-600"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              {customPositionTitles[emp.id] && (
                                <button
                                  onClick={() => {
                                    setCustomPositionTitles((prev) => {
                                      const next = { ...prev };
                                      delete next[emp.id];
                                      return next;
                                    });
                                    setEditingEmpTitle(null);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer whitespace-nowrap"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingEmpTitle(emp.id)}
                              className="ml-1 p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer text-gray-400 hover:text-gray-600"
                              title="Edit position title for this resume"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )
                        )}
                        {empSelected && duties.length > 0 && (
                          <div className="ml-6 mt-1 space-y-0.5">
                            {(() => {
                              const selected = duties.filter((d) => selectedDuties.includes(d.id));
                              const selectedOrdered = [...selected].sort(
                                (a, b) => selectedDuties.indexOf(a.id) - selectedDuties.indexOf(b.id)
                              );
                              const unselected = duties.filter((d) => !selectedDuties.includes(d.id));
                              return (
                                <>
                                  {selectedOrdered.map((duty, idx) => (
                                    <div
                                      key={duty.id}
                                      draggable
                                      onDragStart={() => handleDutyDragStart(emp.id, idx)}
                                      onDragOver={(e) => handleDutyDragOver(e, emp.id, idx)}
                                      onDrop={(e) => handleDutyDrop(e, emp.id, idx)}
                                      onDragEnd={handleDutyDragEnd}
                                      className={cn(
                                        "flex items-start gap-1 rounded transition-all",
                                        dutyDragOver?.empId === emp.id && dutyDragOver?.index === idx &&
                                          "ring-2 ring-blue-400 bg-blue-50"
                                      )}
                                    >
                                      <GripVertical className="h-3.5 w-3.5 text-gray-400 cursor-grab active:cursor-grabbing shrink-0 mt-0.5" />
                                      <label className="flex items-start gap-2 cursor-pointer flex-1">
                                        <input
                                          type="checkbox"
                                          checked={true}
                                          onChange={() => {
                                            setSelectedDuties(selectedDuties.filter((id) => id !== duty.id));
                                          }}
                                          className="rounded mt-0.5"
                                        />
                                        <span className="text-xs text-gray-600">{duty.text}</span>
                                      </label>
                                    </div>
                                  ))}
                                  {unselected.map((duty) => (
                                    <div key={duty.id} className="flex items-start gap-1">
                                      <div className="w-3.5 shrink-0" />
                                      <label className="flex items-start gap-2 cursor-pointer flex-1">
                                        <input
                                          type="checkbox"
                                          checked={false}
                                          onChange={() => {
                                            setSelectedDuties([...selectedDuties, duty.id]);
                                          }}
                                          className="rounded mt-0.5"
                                        />
                                        <span className="text-xs text-gray-400">{duty.text}</span>
                                      </label>
                                    </div>
                                  ))}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Skills selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skills
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedSkills.map((skill, index) => (
                      <div
                        key={skill}
                        draggable
                        onDragStart={() => handleSkillDragStart(index)}
                        onDragOver={(e) => handleSkillDragOver(e, index)}
                        onDrop={(e) => handleSkillDrop(e, index)}
                        onDragEnd={handleSkillDragEnd}
                        className={cn(
                          "transition-all",
                          skillDragOver === index && "ring-2 ring-blue-400 rounded"
                        )}
                      >
                        <button
                          onClick={() => {
                            setSelectedSkills(
                              selectedSkills.filter((s) => s !== skill)
                            );
                          }}
                          className="px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer bg-blue-100 text-blue-700 ring-1 ring-blue-300 flex items-center gap-1"
                        >
                          <GripVertical className="h-3 w-3 text-blue-400 cursor-grab active:cursor-grabbing shrink-0" />
                          {skill}
                        </button>
                      </div>
                    ))}
                    {(profile.skills || [])
                      .filter((skill: string) => !selectedSkills.includes(skill))
                      .map((skill: string) => (
                        <button
                          key={skill}
                          onClick={() => {
                            setSelectedSkills([...selectedSkills, skill]);
                          }}
                          className="px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer bg-gray-100 text-gray-500"
                        >
                          {skill}
                        </button>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold">Customize</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position Title
                  </label>
                  <div className="flex items-center gap-2">
                    {editingPositionTitle ? (
                      <>
                        <input
                          type="text"
                          value={customPositionTitle}
                          onChange={(e) => setCustomPositionTitle(e.target.value)}
                          placeholder={profile?.positionTitle || "Enter position title"}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setEditingPositionTitle(false);
                          }}
                        />
                        <button
                          onClick={() => setEditingPositionTitle(false)}
                          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors cursor-pointer text-green-600"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-gray-900 flex-1">
                          {customPositionTitle || profile?.positionTitle || "No position title set"}
                        </span>
                        <button
                          onClick={() => {
                            if (!customPositionTitle && profile?.positionTitle) {
                              setCustomPositionTitle(profile.positionTitle);
                            }
                            setEditingPositionTitle(true);
                          }}
                          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors cursor-pointer text-gray-400 hover:text-gray-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                  {customPositionTitle && (
                    <button
                      onClick={() => {
                        setCustomPositionTitle("");
                        setEditingPositionTitle(false);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 mt-1 cursor-pointer"
                    >
                      Reset to profile default
                    </button>
                  )}
                </div>

                <Textarea
                  label="Custom Summary (leave blank to use profile summary)"
                  value={customSummary}
                  onChange={(e) => setCustomSummary(e.target.value)}
                  placeholder="Override your profile summary for this resume..."
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Sections
                  </label>
                  {customSections.map((section, i) => (
                    <div
                      key={i}
                      className="mb-3 p-3 border border-gray-200 rounded-md"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Input
                          value={section.title}
                          onChange={(e) => {
                            const updated = [...customSections];
                            updated[i] = {
                              ...updated[i],
                              title: e.target.value,
                            };
                            setCustomSections(updated);
                          }}
                          placeholder="Section Title"
                          className="text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setCustomSections(
                              customSections.filter((_, idx) => idx !== i)
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <Textarea
                        value={section.content}
                        onChange={(e) => {
                          const updated = [...customSections];
                          updated[i] = {
                            ...updated[i],
                            content: e.target.value,
                          };
                          setCustomSections(updated);
                        }}
                        placeholder="Section content..."
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCustomSections([
                        ...customSections,
                        { title: "", content: "" },
                      ])
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Section
                  </Button>
                </div>
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
                {TemplateComponent && (
                  <div className="transform scale-[0.85] origin-top-left w-[118%]">
                    <TemplateComponent data={getCurrentResumeData()} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sticky save bar */}
        <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 py-4 px-6 -mx-4 sm:-mx-6 lg:-mx-8 mt-6">
          <div className="max-w-7xl mx-auto flex items-center justify-end gap-3">
            {resumeDirty && (
              <span className="text-sm text-amber-600 font-medium">Unsaved changes</span>
            )}
            <div
              className="inline-block rounded-md"
              style={resumeDirty ? { animation: "pulseSubtle 2s ease-in-out infinite" } : undefined}
            >
              <Button onClick={handleSaveResume} disabled={saving} size="lg">
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Save Resume
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Resume list mode
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resume Builder</h1>
          <p className="text-gray-600 mt-1">
            Create ATS-friendly resumes from your profile data.
          </p>
        </div>
        <Button onClick={startNewResume}>
          <Plus className="h-4 w-4 mr-2" />
          New Resume
        </Button>
      </div>

      {savedResumes.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            No resumes yet. Create your first one!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedResumes.map((resume) => (
            <Card key={resume.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{resume.name}</h3>
                  <Badge variant="info">
                    {templates[resume.template as keyof typeof templates]?.name ||
                      resume.template}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  {resume.selectedEmployment?.length || 0} jobs,{" "}
                  {resume.selectedEducation?.length || 0} education,{" "}
                  {resume.selectedSkills?.length || 0} skills
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editResume(resume)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewResume(resume)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setExportTarget(resume);
                      setShowExportModal(true);
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteResume(resume.id)}
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
      {previewResume && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewResume(null)}
          title={`Preview: ${previewResume.name}`}
          size="xl"
        >
          <div className="overflow-auto max-h-[70vh]">
            {(() => {
              const T =
                templates[previewResume.template as keyof typeof templates]
                  ?.component;
              return T ? <T data={getResumeData(previewResume)} /> : null;
            })()}
          </div>
        </Modal>
      )}

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Resume"
        size="sm"
      >
        {exportTarget && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Choose an export format for &quot;{exportTarget.name}&quot;
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => handleExport("pdf")}
                className="flex-1"
              >
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

"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PersonalInfoForm } from "@/components/profile/personal-info-form";
import {
  EducationForm,
  type EducationEntry,
} from "@/components/profile/education-form";
import {
  EmploymentForm,
  type EmploymentEntry,
} from "@/components/profile/employment-form";
import { Check, ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { cn, formatDateRange } from "@/lib/utils";

const steps = [
  { id: "personal", label: "Personal Info" },
  { id: "education", label: "Education" },
  { id: "employment", label: "Employment" },
  { id: "review", label: "Review" },
];

interface PersonalData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  positionTitle: string;
  skills: string[];
  portfolio: string;
  github: string;
  linkedin: string;
  summary: string;
}

const defaultPersonal: PersonalData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  positionTitle: "",
  skills: [],
  portfolio: "",
  github: "",
  linkedin: "",
  summary: "",
};

export default function ProfilePage() {
  const [currentStep, setCurrentStepRaw] = useState(() => {
    if (typeof window !== "undefined") {
      const match = window.location.pathname.match(/^\/profile\/(.+)$/);
      if (match) {
        const idx = steps.findIndex((s) => s.id === match[1]);
        if (idx >= 0) return idx;
      }
    }
    return 0;
  });

  function setCurrentStep(step: number | ((prev: number) => number)) {
    setCurrentStepRaw((prev) => {
      const next = typeof step === "function" ? step(prev) : step;
      const id = steps[next]?.id;
      if (id) {
        window.history.replaceState(null, "", `/profile/${id}`);
      }
      return next;
    });
  }
  const [personal, setPersonal] = useState<PersonalData>(defaultPersonal);
  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>(
    []
  );
  const [employmentEntries, setEmploymentEntries] = useState<
    EmploymentEntry[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const savedStateRef = useRef({
    personal: defaultPersonal,
    education: [] as EducationEntry[],
    employment: [] as EmploymentEntry[],
  });
  const profileDirty =
    JSON.stringify(personal) !== JSON.stringify(savedStateRef.current.personal) ||
    JSON.stringify(educationEntries) !== JSON.stringify(savedStateRef.current.education) ||
    JSON.stringify(employmentEntries) !== JSON.stringify(savedStateRef.current.employment);
  const dirtyRef = useRef(false);
  dirtyRef.current = profileDirty;

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
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const res = await fetch("/api/profile");
      const profile = await res.json();
      if (profile && profile.id) {
        const loadedPersonal: PersonalData = {
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          email: profile.email || "",
          phone: profile.phone || "",
          address: profile.address || "",
          positionTitle: profile.positionTitle || "",
          skills: profile.skills || [],
          portfolio: profile.portfolio || "",
          github: profile.github || "",
          linkedin: profile.linkedin || "",
          summary: profile.summary || "",
        };
        setPersonal(loadedPersonal);

        const [eduRes, empRes] = await Promise.all([
          fetch("/api/education"),
          fetch("/api/employment"),
        ]);
        const edu = await eduRes.json();
        const emp = await empRes.json();
        const mappedEducation: EducationEntry[] = edu.map(
          (e: EducationEntry & { id: string }) =>
            ({
              id: e.id,
              institution: e.institution || "",
              location: e.location || "",
              yearFrom: e.yearFrom,
              yearTo: e.yearTo,
              diplomaType: e.diplomaType || "",
              concentration: e.concentration || "",
              minor: e.minor || "",
            }) as EducationEntry
        );
        const mappedEmployment: EmploymentEntry[] = emp.map(
          (e: EmploymentEntry & { id: string }) =>
            ({
              id: e.id,
              companyName: e.companyName || "",
              location: e.location || "",
              positionTitle: e.positionTitle || "",
              monthFrom: e.monthFrom,
              yearFrom: e.yearFrom,
              monthTo: e.monthTo,
              yearTo: e.yearTo,
              isCurrent: e.isCurrent || false,
              duties: Array.isArray(e.duties) ? e.duties : [],
            }) as EmploymentEntry
        );
        setEducationEntries(mappedEducation);
        setEmploymentEntries(mappedEmployment);
        savedStateRef.current = {
          personal: loadedPersonal,
          education: mappedEducation,
          employment: mappedEmployment,
        };
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const profileRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(personal),
      });
      await profileRes.json();

      // Save education entries
      for (const entry of educationEntries) {
        const payload = { ...entry };
        if (entry.id) {
          await fetch(`/api/education/${entry.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          const res = await fetch("/api/education", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const saved = await res.json();
          entry.id = saved.id;
        }
      }

      // Save employment entries
      for (const entry of employmentEntries) {
        const payload = { ...entry };
        if (entry.id) {
          await fetch(`/api/employment/${entry.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          const res = await fetch("/api/employment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const saved = await res.json();
          entry.id = saved.id;
        }
      }

      savedStateRef.current = {
        personal,
        education: educationEntries,
        employment: employmentEntries,
      };
      toast.success("Profile saved successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-1">
          Build your professional profile to use across resumes and cover
          letters.
        </p>
      </div>

      {/* Stepper */}
      <nav className="mb-8">
        <ol className="flex items-center">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={cn("flex items-center", index < steps.length - 1 && "flex-1")}
            >
              <button
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium cursor-pointer",
                  index <= currentStep ? "text-blue-600" : "text-gray-400"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                    index < currentStep
                      ? "bg-blue-600 text-white"
                      : index === currentStep
                        ? "border-2 border-blue-600 text-blue-600"
                        : "border-2 border-gray-300 text-gray-400"
                  )}
                >
                  {index < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-4 h-0.5 flex-1",
                    index < currentStep ? "bg-blue-600" : "bg-gray-200"
                  )}
                />
              )}
            </li>
          ))}
        </ol>
      </nav>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            {steps[currentStep].label}
          </h2>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && (
            <PersonalInfoForm data={personal} onChange={setPersonal} />
          )}
          {currentStep === 1 && (
            <EducationForm
              entries={educationEntries}
              onChange={setEducationEntries}
            />
          )}
          {currentStep === 2 && (
            <EmploymentForm
              entries={employmentEntries}
              onChange={setEmploymentEntries}
            />
          )}
          {currentStep === 3 && (
            <ReviewSection
              personal={personal}
              education={educationEntries}
              employment={employmentEntries}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <div>
          {currentStep < steps.length - 1 && (
            <Button
              onClick={() =>
                setCurrentStep((s) => Math.min(steps.length - 1, s + 1))
              }
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 py-4 px-6 -mx-4 sm:-mx-6 lg:-mx-8 mt-6">
        <div className="max-w-7xl mx-auto flex items-center justify-end gap-3">
          {profileDirty && (
            <span className="text-sm text-amber-600 font-medium">Unsaved changes</span>
          )}
          <div
            className="inline-block rounded-md"
            style={profileDirty ? { animation: "pulseSubtle 2s ease-in-out infinite" } : undefined}
          >
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Profile
            </Button>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
}

function ReviewSection({
  personal,
  education,
  employment,
}: {
  personal: PersonalData;
  education: EducationEntry[];
  employment: EmploymentEntry[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Personal Information
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-gray-500">Name:</span>{" "}
            {personal.firstName} {personal.lastName}
          </div>
          <div>
            <span className="text-gray-500">Email:</span> {personal.email}
          </div>
          <div>
            <span className="text-gray-500">Phone:</span> {personal.phone}
          </div>
          <div>
            <span className="text-gray-500">Title:</span>{" "}
            {personal.positionTitle}
          </div>
          {personal.address && (
            <div className="col-span-2">
              <span className="text-gray-500">Address:</span>{" "}
              {personal.address}
            </div>
          )}
        </div>
        {personal.skills.length > 0 && (
          <div className="mt-2 text-sm">
            <span className="text-gray-500">Skills:</span>{" "}
            {personal.skills.join(", ")}
          </div>
        )}
        {personal.summary && (
          <div className="mt-2 text-sm">
            <span className="text-gray-500">Summary:</span>{" "}
            {personal.summary}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Education ({education.length})
        </h3>
        {education.map((entry, i) => (
          <div key={i} className="mb-3 text-sm border-l-2 border-blue-200 pl-3">
            <div className="font-medium">{entry.institution}</div>
            <div className="text-gray-500">
              {entry.diplomaType}
              {entry.concentration && ` in ${entry.concentration}`}
              {entry.minor && `, Minor: ${entry.minor}`}
            </div>
            <div className="text-gray-400">
              {entry.location} | {entry.yearFrom} - {entry.yearTo}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Employment ({employment.length})
        </h3>
        {employment.map((entry, i) => (
          <div key={i} className="mb-3 text-sm border-l-2 border-green-200 pl-3">
            <div className="font-medium">
              {entry.positionTitle} at {entry.companyName}
            </div>
            <div className="text-gray-500">
              {entry.location} | {formatDateRange(entry.monthFrom, entry.yearFrom, entry.monthTo, entry.yearTo, entry.isCurrent)}
            </div>
            {entry.duties.length > 0 && (
              <ul className="text-gray-400 mt-1 list-disc list-inside text-xs space-y-0.5">
                {entry.duties.map((d) => (
                  <li key={d.id}>{d.text}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

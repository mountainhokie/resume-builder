"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

export interface EducationEntry {
  id?: string;
  institution: string;
  location: string;
  yearFrom: number | null;
  yearTo: number | null;
  diplomaType: string;
  concentration: string;
  minor: string;
}

interface EducationFormProps {
  entries: EducationEntry[];
  onChange: (entries: EducationEntry[]) => void;
}

const diplomaTypes = [
  { value: "", label: "Select Diploma Type" },
  { value: "High School Diploma", label: "High School Diploma" },
  { value: "Associate", label: "Associate's Degree" },
  { value: "Bachelor", label: "Bachelor's Degree" },
  { value: "Master", label: "Master's Degree" },
  { value: "Doctorate", label: "Doctorate" },
  { value: "Certificate", label: "Certificate" },
  { value: "Bootcamp", label: "Bootcamp" },
  { value: "Other", label: "Other" },
];

function emptyEducation(): EducationEntry {
  return {
    institution: "",
    location: "",
    yearFrom: null,
    yearTo: null,
    diplomaType: "",
    concentration: "",
    minor: "",
  };
}

export function EducationForm({ entries, onChange }: EducationFormProps) {
  const addEntry = () => {
    onChange([...entries, emptyEducation()]);
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (
    index: number,
    field: keyof EducationEntry,
    value: string | number | null
  ) => {
    const updated = entries.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry
    );
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {entries.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-8">
          No education entries yet. Click &quot;Add Education&quot; to get
          started.
        </p>
      )}

      {entries.map((entry, index) => (
        <Card key={index}>
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Education #{index + 1}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeEntry(index)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Institution"
                value={entry.institution}
                onChange={(e) =>
                  updateEntry(index, "institution", e.target.value)
                }
                placeholder="University of Example"
              />
              <Input
                label="Location"
                value={entry.location}
                onChange={(e) =>
                  updateEntry(index, "location", e.target.value)
                }
                placeholder="City, State"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Year From"
                type="number"
                value={entry.yearFrom ?? ""}
                onChange={(e) =>
                  updateEntry(
                    index,
                    "yearFrom",
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                placeholder="2018"
              />
              <Input
                label="Year To"
                type="number"
                value={entry.yearTo ?? ""}
                onChange={(e) =>
                  updateEntry(
                    index,
                    "yearTo",
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                placeholder="2022"
              />
              <Select
                label="Diploma Type"
                value={entry.diplomaType}
                onChange={(e) =>
                  updateEntry(index, "diplomaType", e.target.value)
                }
                options={diplomaTypes}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Concentration / Major"
                value={entry.concentration}
                onChange={(e) =>
                  updateEntry(index, "concentration", e.target.value)
                }
                placeholder="Computer Science"
              />
              <Input
                label="Minor"
                value={entry.minor}
                onChange={(e) =>
                  updateEntry(index, "minor", e.target.value)
                }
                placeholder="Mathematics"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addEntry}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Education
      </Button>
    </div>
  );
}
